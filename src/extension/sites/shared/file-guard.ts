import {
  isBinaryFileTooLarge,
  isBinaryScannableFile,
} from '../../../core/binary-file.js';
import {
  buildRedactedFile,
  consumeReplacedInputMark,
  isTextLikeFile,
  readFileAsText,
  replaceInputFiles,
} from '../../../core/text-file.js';
import type { LlmHost, Policy, RuleType } from '../../../core/types.js';
import {
  applyRedactionsToText,
  evaluateGuard,
  type GuardDecision,
} from '../../content/analyze.js';
import { reportDlpAction, reportTruncation } from '../../content/telemetry-reporter.js';
import { showBlockAlert } from '../../content/ui-host.js';
import { extractBinaryText } from './binary-extract.js';
import {
  blockFileModalCopy,
  blockUnsupportedFileFormatCopy,
  fileRedactNotice,
  fileScanFailedNotice,
  fileTooLargeNotice,
  resolveLocale,
  truncationNotice,
} from '../../../ui/i18n/messages.js';

export type FileGuardOptions = {
  getPolicy: () => Policy;
  host: LlmHost;
  /** Scan des pièces jointes (Pro). Si absent ou `true`, le scan est actif. */
  isFileScanEnabled?: () => boolean;
  /** Valeurs allowlistées (Pro) à exclure des détections. Si absent, aucune exclusion. */
  getAllowlist?: () => readonly string[];
};

let toastHost: HTMLDivElement | null = null;

function showToast(message: string): void {
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.id = 'shadow-ai-sentinel-file-toast';
    Object.assign(toastHost.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483646',
      maxWidth: '360px',
      padding: '12px 16px',
      borderRadius: '8px',
      background: '#111827',
      color: '#f9fafb',
      fontSize: '13px',
      fontFamily: 'system-ui, sans-serif',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
    });
    document.documentElement.appendChild(toastHost);
  }

  toastHost.textContent = message;
  toastHost.style.display = 'block';
  window.setTimeout(() => {
    if (toastHost) {
      toastHost.style.display = 'none';
    }
  }, 5000);
}

function showFileRedactToast(ruleTypes: RuleType[], fileName: string): void {
  showToast(fileRedactNotice(ruleTypes, fileName, resolveLocale()));
}

function showBlockFileAlert(ruleType: RuleType, fileName: string): void {
  const locale = resolveLocale();
  const copy = blockFileModalCopy(ruleType, fileName, locale);
  showBlockAlert(ruleType, copy);
}

function showUnsupportedFormatBlockAlert(ruleTypes: RuleType[], fileName: string): void {
  const locale = resolveLocale();
  const copy = blockUnsupportedFileFormatCopy(ruleTypes, fileName, locale);
  showBlockAlert(ruleTypes[0] ?? 'generic_secret', copy);
}

function showFileTooLargeToast(fileName: string): void {
  showToast(fileTooLargeNotice(fileName, resolveLocale()));
}

function showFileScanFailedToast(fileName: string): void {
  showToast(fileScanFailedNotice(fileName, resolveLocale()));
}

function showFileTruncatedToast(fileName: string): void {
  const safeName = fileName.replace(/[<>]/g, '');
  const locale = resolveLocale();
  const base = truncationNotice(locale);
  showToast(locale === 'fr' ? `Fichier « ${safeName} » : ${base}` : `File “${safeName}”: ${base}`);
}

type ProcessedFileResult =
  | { status: 'ok'; file: File; truncated?: boolean }
  | { status: 'block'; ruleType: RuleType }
  | { status: 'block-unsupported-format'; ruleTypes: RuleType[] }
  | { status: 'redact'; file: File; ruleTypes: RuleType[]; truncated?: boolean }
  | { status: 'warn'; file: File; reason: 'too-large' | 'parse-failed' };

async function evaluateExtractedText(
  file: File,
  text: string,
  policy: Policy,
  allowlist?: readonly string[],
): Promise<ProcessedFileResult> {
  const decision: GuardDecision = evaluateGuard(text, policy, allowlist);
  const truncated = decision.truncated === true;

  if (decision.kind === 'allow') {
    return { status: 'ok', file, truncated };
  }

  if (decision.kind === 'block') {
    return { status: 'block', ruleType: decision.match.ruleType };
  }

  const redacted = applyRedactionsToText(text, decision.matches);
  const ruleTypes = decision.matches.map((m) => m.ruleType);
  return {
    status: 'redact',
    file: buildRedactedFile(file, redacted),
    ruleTypes,
    truncated,
  };
}

async function processTextFile(
  file: File,
  policy: Policy,
  allowlist?: readonly string[],
): Promise<ProcessedFileResult> {
  let text: string;
  try {
    text = await readFileAsText(file);
  } catch {
    return { status: 'ok', file };
  }

  return evaluateExtractedText(file, text, policy, allowlist);
}

/**
 * PDF/DOCX : même pipeline de décision que le texte brut, mais une décision "redact" est
 * impossible à appliquer fidèlement sur un binaire (pas de réécriture en place) — elle est donc
 * traitée comme un blocage. Taille excessive ou échec de parsing (corrompu/chiffré) : le fichier
 * passe, avec un avertissement, plutôt qu'un blocage (on ne bloque jamais sur une incertitude).
 */
async function processBinaryFile(
  file: File,
  policy: Policy,
  allowlist?: readonly string[],
): Promise<ProcessedFileResult> {
  if (isBinaryFileTooLarge(file)) {
    return { status: 'warn', file, reason: 'too-large' };
  }

  let text: string;
  try {
    text = await extractBinaryText(file);
  } catch {
    return { status: 'warn', file, reason: 'parse-failed' };
  }

  const result = await evaluateExtractedText(file, text, policy, allowlist);
  if (result.status === 'redact') {
    return { status: 'block-unsupported-format', ruleTypes: result.ruleTypes };
  }
  return result;
}

async function processFile(
  file: File,
  policy: Policy,
  allowlist?: readonly string[],
): Promise<ProcessedFileResult> {
  if (isTextLikeFile(file)) {
    return processTextFile(file, policy, allowlist);
  }
  if (isBinaryScannableFile(file)) {
    return processBinaryFile(file, policy, allowlist);
  }
  return { status: 'ok', file };
}

export async function guardFileList(
  files: File[],
  options: FileGuardOptions,
): Promise<{ allowed: File[]; blocked: boolean }> {
  // Scan des pièces jointes réservé au Pro : en Free, on laisse tout passer.
  if (options.isFileScanEnabled && !options.isFileScanEnabled()) {
    return { allowed: files, blocked: false };
  }

  const policy = options.getPolicy();
  const allowlist = options.getAllowlist?.();
  const allowed: File[] = [];
  let blocked = false;

  for (const file of files) {
    const result = await processFile(file, policy, allowlist);

    if (result.status === 'block') {
      showBlockFileAlert(result.ruleType, file.name);
      void reportDlpAction(result.ruleType, 'block', options.host);
      blocked = true;
      break;
    }

    if (result.status === 'block-unsupported-format') {
      showUnsupportedFormatBlockAlert(result.ruleTypes, file.name);
      const primary = result.ruleTypes[0];
      if (primary) {
        void reportDlpAction(primary, 'block', options.host);
      }
      blocked = true;
      break;
    }

    if (result.status === 'redact') {
      allowed.push(result.file);
      showFileRedactToast(result.ruleTypes, file.name);
      const primary = result.ruleTypes[0];
      if (primary) {
        void reportDlpAction(primary, 'redact', options.host);
      }
      if (result.truncated) {
        showFileTruncatedToast(file.name);
        void reportTruncation(options.host);
      }
      continue;
    }

    if (result.status === 'warn') {
      allowed.push(result.file);
      if (result.reason === 'too-large') {
        showFileTooLargeToast(file.name);
      } else {
        showFileScanFailedToast(file.name);
      }
      continue;
    }

    allowed.push(result.file);
    if (result.status === 'ok' && result.truncated) {
      showFileTruncatedToast(file.name);
      void reportTruncation(options.host);
    }
  }

  return { allowed, blocked };
}

function filesFromInput(target: EventTarget | null): File[] {
  if (!(target instanceof HTMLInputElement) || target.type !== 'file') {
    return [];
  }
  return Array.from(target.files ?? []);
}

function filesFromDataTransfer(dt: DataTransfer | null): File[] {
  if (!dt?.files?.length) {
    return [];
  }
  return Array.from(dt.files);
}

function isScannableFile(file: File): boolean {
  return isTextLikeFile(file) || isBinaryScannableFile(file);
}

/** Au moins un fichier scannable (texte, PDF ou DOCX) dans la liste. */
export function hasScannableInList(files: File[]): boolean {
  return files.some(isScannableFile);
}

export function attachFileGuard(options: FileGuardOptions): () => void {
  async function onChange(event: Event): Promise<void> {
    const files = filesFromInput(event.target);
    if (files.length === 0 || !hasScannableInList(files)) {
      return;
    }

    const input = event.target as HTMLInputElement;
    if (consumeReplacedInputMark(input)) {
      // `change` re-dispatché par replaceInputFiles : fichiers déjà scannés,
      // laisser l'événement atteindre le site (sinon boucle de re-scan).
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const snapshot = [...files];
    input.value = '';

    const { allowed, blocked } = await guardFileList(snapshot, options);

    if (blocked) {
      return;
    }

    replaceInputFiles(input, allowed);
  }

  async function onDrop(event: DragEvent): Promise<void> {
    const files = filesFromDataTransfer(event.dataTransfer);
    if (files.length === 0 || !hasScannableInList(files)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const { allowed, blocked } = await guardFileList(files, options);

    if (blocked) {
      return;
    }

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      replaceInputFiles(fileInput, allowed);
    }
  }

  async function onPaste(event: ClipboardEvent): Promise<void> {
    const files = filesFromDataTransfer(event.clipboardData);
    if (files.length === 0 || !hasScannableInList(files)) {
      return;
    }

    const { blocked } = await guardFileList(files, options);
    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  const changeHandler = (event: Event) => {
    void onChange(event);
  };
  const dropHandler = (event: DragEvent) => {
    void onDrop(event);
  };
  const pasteHandler = (event: ClipboardEvent) => {
    void onPaste(event);
  };

  document.addEventListener('change', changeHandler, true);
  document.addEventListener('drop', dropHandler, true);
  document.addEventListener('paste', pasteHandler, true);

  return () => {
    document.removeEventListener('change', changeHandler, true);
    document.removeEventListener('drop', dropHandler, true);
    document.removeEventListener('paste', pasteHandler, true);
  };
}
