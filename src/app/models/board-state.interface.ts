export interface BoardState {
  words: Word[];

  //  Índices de cuadrícula
  rowIndex: number;
  columnIndex: number;

  //  Estado del juego
  gameStatus: GameStatus;
  error: string;
}

export interface Word {
  letters: Letter[];
}

export interface Letter {
  value: string;
  perfect: boolean;
  partial: boolean;
  committed: boolean;
}

export enum GameStatus {
  Active,
  Completed,
  Failed
}
