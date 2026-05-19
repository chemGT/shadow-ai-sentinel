export type ApiConfig = {
  port: number;
  telemetryRetentionDays: number;
  rateLimitPoliciesPerMin: number;
  rateLimitTelemetryPerMin: number;
  corsOrigins: string[] | '*';
  trustProxy: boolean;
};

export function loadApiConfig(): ApiConfig {
  const retentionDays = Number(process.env.TELEMETRY_RETENTION_DAYS ?? 90);
  const corsRaw = process.env.CORS_ORIGINS?.trim();

  return {
    port: Number(process.env.PORT ?? 3000),
    telemetryRetentionDays: Number.isFinite(retentionDays) && retentionDays > 0 ? retentionDays : 90,
    rateLimitPoliciesPerMin: Number(process.env.RATE_LIMIT_POLICIES_PER_MIN ?? 60),
    rateLimitTelemetryPerMin: Number(process.env.RATE_LIMIT_TELEMETRY_PER_MIN ?? 120),
    corsOrigins: corsRaw && corsRaw.length > 0 ? corsRaw.split(',').map((o) => o.trim()) : '*',
    trustProxy: process.env.TRUST_PROXY === 'true',
  };
}
