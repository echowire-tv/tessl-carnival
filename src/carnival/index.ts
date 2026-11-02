export { createRegistry, type CarnivalGame } from './registry';
export { recordScore, bestScore, topScores, createScoreBoard, type ScoreEntry } from './scores';
export {
  createTicketWallet,
  ticketBalance,
  earnTickets,
  spendTickets,
  ticketsForScore,
  type TicketWallet,
} from './tickets';
export { prizeFor, type PrizeTier } from './prizes';
export { theme, canvasFont, applyTheme } from './theme';
