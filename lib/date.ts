import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

// Fuso oficial da aplicação. Garante exibição correta independente do
// timezone do servidor (a Vercel roda em UTC), evitando o deslocamento
// de horário no histórico e demais datas.
export const APP_TIME_ZONE = "America/Sao_Paulo";

type DateInput = Date | string | number;

/** Data + hora no horário de Brasília. Ex.: 18/06/2026 às 14:30 */
export function formatDateTimeBR(value: DateInput): string {
  return formatInTimeZone(
    new Date(value),
    APP_TIME_ZONE,
    "dd/MM/yyyy 'às' HH:mm",
    { locale: ptBR }
  );
}

/** Apenas a data, no horário de Brasília. Ex.: 18/06/2026 */
export function formatDateBR(value: DateInput): string {
  return formatInTimeZone(new Date(value), APP_TIME_ZONE, "dd/MM/yyyy", {
    locale: ptBR,
  });
}
