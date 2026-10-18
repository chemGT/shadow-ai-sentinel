# ADR 003 — Multi-tenant Postgres : row-level isolation via middleware

**Date** : 2026-06-12  
**Statut** : Remplacé (2026-10-18) — backend multi-tenant archivé (branche `archive/saas-portal`)
lors du passage open source.  
**Décideurs** : chemGT (solo)  
**Sprint** : S1-I2 / S1-I3

---

## Contexte

Sprint 1 introduit plusieurs tenants (organisations clientes) sur une instance backend partagée. Chaque tenant doit avoir une isolation stricte de ses données : policies, telemetry_events, audit_log, api_keys.

Trois approches classiques existent pour le multi-tenant Postgres :

1. **Un schéma Postgres par tenant** (schema-per-tenant)
2. **Une base par tenant** (db-per-tenant)
3. **Table partagée avec colonne `tenant_id` + isolation middleware** (shared-schema)

---

## Décision

**Option retenue : shared-schema avec isolation par middleware Express.**

Toutes les tables partagent un seul schéma public. Chaque ligne possède une colonne `tenant_id UUID NOT NULL`. Le middleware Express extrait le tenant depuis le Bearer token (API key hashée en DB), puis toutes les requêtes sont automatiquement filtrées par `WHERE tenant_id = $current`.

---

## Justification

### Pourquoi pas schema-per-tenant ?

- Nécessite des migrations exécutées N fois (une par tenant) — charge opérationnelle dès 10 tenants
- Connexion pool Postgres partagé + search_path dynamique = complexité accrue
- Pas de gain de sécurité réel vs middleware correctement implémenté à ce stade (<100 tenants)

### Pourquoi pas db-per-tenant ?

- Coût infrastructure (une connexion pool par db)
- Justifié uniquement pour des tenants enterprise nécessitant une isolation physique contractuelle (SOC2 niveau 2, HIPAA) — hors scope Sprint 1-2

### Pourquoi shared-schema + middleware ?

- Stack la plus simple à maintenir en solo
- Migrations Drizzle/Prisma exécutées une seule fois
- Isolation testable unitairement (mock du tenant_id injecté)
- Chemin de migration vers Row Level Security (RLS) Postgres préservé (Sprint 2-3 si requis)
- Performance : un seul pool de connexions, index sur `tenant_id` couvrent les cas courants

---

## Schéma des tables principales

```sql
tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  plan        TEXT NOT NULL DEFAULT 'trial',     -- trial | team | business
  created_at  TIMESTAMPTZ DEFAULT now()
)

api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL,                      -- bcrypt(sk_live_xxx)
  key_prefix  TEXT NOT NULL,                      -- sk_live_XXXX (8 chars visible)
  scopes      TEXT[] NOT NULL,                    -- ['policies:read','telemetry:write']
  expires_at  TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
)

policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payload     JSONB NOT NULL,
  version     INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
)

telemetry_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  host        TEXT NOT NULL,
  rule_type   TEXT NOT NULL,
  action      TEXT NOT NULL,                      -- blocked | redacted
  ts          TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Partition par mois si > 1M events/mois
)

audit_log (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  payload     JSONB,
  ts          TIMESTAMPTZ DEFAULT now()
  -- Append-only : pas de UPDATE/DELETE permis via applicatif
)
```

---

## Isolation middleware (pattern)

```typescript
// src/backend/middleware/tenant.ts
export async function tenantMiddleware(req, res, next) {
  const bearer = req.headers.authorization?.replace('Bearer ', '');
  if (!bearer) return res.status(401).json({ error: 'missing_token' });

  const key = await db.apiKeys.findByPrefix(bearer.slice(0, 12));
  if (!key || !bcrypt.compare(bearer, key.keyHash)) {
    return res.status(401).json({ error: 'invalid_token' });
  }
  if (key.revokedAt) return res.status(401).json({ error: 'revoked' });

  req.tenant = { id: key.tenantId, scopes: key.scopes };
  next();
}
```

Toutes les queries DB passent par un wrapper `tenantScoped(db, req.tenant.id)` qui ajoute `.where(eq(table.tenantId, tenantId))`.

---

## Conséquences

- Tests d'isolation obligatoires (5+ cas cross-tenant) avant merge S1-I3
- RLS Postgres désactivé pour Sprint 1, activable en Sprint 2 si audit SOC2 requis
- Purge telemetry : job nocturne selon rétention par plan (30j trial, 90j team, 365j business)
- Pas de partitionnement `telemetry_events` avant 1M events/mois constatés

---

## Alternatives futures

- **RLS Postgres** : à activer en Sprint 2-3 pour défense en profondeur (double filet middleware + DB)
- **db-per-tenant** : envisageable pour un contrat Enterprise nécessitant isolation physique contractuelle
