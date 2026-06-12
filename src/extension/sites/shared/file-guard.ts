import {
  buildRedactedFile,
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
import { reportDlpAction } from '../../content/telemetry-reporter.js';
import { showBlockAlert } from '../../content/ui-host.js';
import {
  blockFileModalCopy,
  fileRedactNotice,
  resolveLocale,
} from '../../../ui/i18n/messages.js';

export type FileGuardOptions = {
  getPolicy: () => Policy;
  host: LlmHost;
};

let toastHost: HTMLDivElement | null = null;

function showFileRedactToast(ruleTypes: RuleType[], fileName: string): void {
  const locale = resolveLocale();
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

  toastHost.textContent = fileRedactNotice(ruleTypes, fileName, locale);
  toastHost.style.display = 'block';
  window.setTimeout(() => {
    if (toastHost) {
      toastHost.style.display = 'none';
    }
  }, 5000);
}

function showBlockFileAlert(ruleType: RuleType, fileName: string): void {
  const locale = resolveLocale();
  const copy = blockFileModalCopy(ruleType, fileName, locale);
  showBlockAlert(ruleType, copy);
}

type ProcessedFileResult =
  | { status: 'ok'; file: File }
  | { status: 'block'; ruleType: RuleType }
  | { status: 'redact'; file: File; ruleTypes: RuleType[] };

async function processTextFile(file: File, policy: Policy): Promise<ProcessedFileResult> {
  if (!isTextLikeFile(file)) {
    return { status: 'ok', file };
  }

  let text: string;
  try {
    text = await readFileAsText(file);
  } catch {
    return { status: 'ok', file };
  }

  const decision: GuardDecision = evaluateGuard(text, policy);

  if (decision.kind === 'allow') {
    return { status: 'ok', file };
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
  };
}

async function guardFileList(
  files: File[],
  options: FileGuardOptions,
): Promise<{ allowed: File[]; blocked: boolean }> {
  const policy = options.getPolicy();
  const allowed: File[] = [];
  let blocked = false;

  for (const file of files) {
    const result = await processTextFile(file, policy);

    if (result.status === 'block') {
      showBlockFileAlert(result.ruleType, file.name);
      void reportDlpAction(result.ruleType, 'block', options.host);
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
      continue;
    }

    allowed.push(result.file);
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

function hasTextLikeInList(files: File[]): boolean {
  return files.some(isTextLikeFile);
}

export function attachFileGuard(options: FileGuardOptions): () => void {
  async function onChange(event: Event): Promise<void> {
    const files = filesFromInput(event.target);
    if (files.length === 0 || !hasTextLikeInList(files)) {
      return;
    }

    const input = event.target as HTMLInputElement;
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
    if (files.length === 0 || !hasTextLikeInList(files)) {
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
    if (files.length === 0 || !hasTextLikeInList(files)) {
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
