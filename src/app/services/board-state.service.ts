import { Injectable } from '@angular/core';
import { BehaviorSubject, timer } from 'rxjs';
import { DefaultWordLength, MaxGuesses } from '../constants';
import { BoardState, GameStatus, Letter, Word } from '../models/board-state.interface';
import { Session } from '../models/session.interface';
import { DictionaryService } from './dictionary.service';
import { KeyboardService } from './keyboard.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})

export class BoardStateService {
  boardState: BehaviorSubject<BoardState> = new BehaviorSubject<BoardState>({ error: "", gameStatus: GameStatus.Active } as BoardState);
  session: Session;
  wordLength: number = DefaultWordLength;

  constructor(
    private dictionaryService: DictionaryService,
    private keyboardService: KeyboardService,
    private sessionService: SessionService
  ) {

    this.sessionService.session.subscribe(session => {
      if (!session) return;

      this.session = session;
    });
  }

  /** MÉTODOS DE INICIO DEL JUEGO */
  public initialize(): void {
    if (this.shouldLoadPreviousSession()) {
      this.loadExistingSession();
    } else {
      this.reset();
    }

    this.startTimer();
  }

  public startNewGame(): void {
    this.reset();
   // Sobrescribe la sesión anterior
    this.updateSession();
  }

  public concede(): void {
    // Complete el tablero con conjeturas falsas: necesarias para que las sesiones existentes se carguen correctamente
    let emptyGuess: string = "".padEnd(this.wordLength, " ");

    for (let i = this.session.guesses.length; i < 6; i++) {
      this.session.guesses.push(emptyGuess);
    }

    this.endCurrentGame(GameStatus.Failed);
    this.updateSession();
  }

  public startSharedGame(secret: string): void {
    this.wordLength = secret.length;

    this.session.secret = secret;

    this.session.guesses = [];

    // La sesión debe ser consciente de que es un juego compartido para el seguimiento de estadísticas/juego
    this.session.shared = true;

    this.resetBoard();

    //  Overwrite the previous session
    this.updateSession();

    this.resetTimer();

    this.startTimer();
  }

  /**
    * Inicia el cronómetro del juego (usado para resultados, estadísticas, historial)
    * Actualiza automáticamente la sesión cada 30 segundos mientras el juego está activo
    */
  private startTimer(): void {
    timer(0, 1000).subscribe(ellapsedCycles => {
      // El juego no es la pestaña activa del navegador
      if (document.hidden) return;
      // No se han hecho conjeturas hasta el momento
      if (this.session.guesses.length === 0) return;

      let boardState: BoardState = this.boardState.value;

      //  El juego ha terminado
      if (boardState.gameStatus !== GameStatus.Active) return;

      ++this.session.time;

      this.sessionService.session.next(this.session);

      //Actualiza automáticamente la sesión cada 30 segundos
      if (this.session.time % 30 === 0) {
        this.sessionService.save();
      }
    });
  }

  private reset(): void {
    this.wordLength = +this.session.options.wordLength;

    this.session.secret = this.dictionaryService.generateWord(this.wordLength);

    this.session.guesses = [];

    this.session.shared = false;

    this.resetBoard();

    this.resetTimer();
  }

  private resetBoard(): void {
    let boardState = this.getDefaultBoardState();

    this.keyboardService.initialize();

    this.boardState.next(boardState);
  }

  private getDefaultBoardState(): BoardState {
    let boardState: BoardState = {} as BoardState;

    boardState.rowIndex = 0;
    boardState.columnIndex = -1;
    boardState.gameStatus = GameStatus.Active;
    boardState.error = "";
    boardState.words = [];

    for (let i = 0; i < MaxGuesses; i++) {
      let word = {} as Word;
      word.letters = [];

      boardState.words.push(word);

      for (let j = 0; j < this.wordLength; j++) {
        let letter = { value: "", perfect: false, partial: false, committed: false } as Letter;
        boardState.words[i].letters.push(letter);
      }
    }

    return boardState;
  }

  private loadExistingSession(): void {
    let previousGuess: string = "";

    this.wordLength = this.session.guesses[0].length;

    this.resetBoard();

    for (let i = 0; i < this.session.guesses.length; i++) {
      previousGuess = this.session.guesses[i];

      this.updateBoardState(previousGuess);
    }

    let gameStatus = this.getGameStatus();

    if (gameStatus !== GameStatus.Active) {
      this.endCurrentGame(gameStatus);
    }
  }

  private shouldLoadPreviousSession(): boolean {
    return this.session.guesses && this.session.guesses.length > 0;
  }

  /** MÉTODOS DE FINALIZACIÓN DEL JUEGO **/

  private getGameStatus(): GameStatus {
    if (this.secretGuessed()) {
      return GameStatus.Completed;
    }

    if (this.exceededMaxGuesses()) {
      return GameStatus.Failed;
    }

    return GameStatus.Active;
  }

  private secretGuessed(): boolean {
    let length: number = this.session.guesses.length - 1;

    for (let i = length; i >= 0; i--) {
      let previousGuess: string = this.session.guesses[i];

      if (previousGuess === this.session.secret) {
        return true;
      }
    }

    return false;
  }

  private exceededMaxGuesses(): boolean {
    let boardState: BoardState = this.boardState.value;

    return boardState.rowIndex >= MaxGuesses;
  }

  private endCurrentGame(gameStatus: GameStatus): void {
    let boardState: BoardState = this.boardState.value;

    boardState.gameStatus = gameStatus;

    this.boardState.next(boardState);
  }

  /** MÉTODOS DE ENTRADA DEL USUARIO */

  public removeInput(): void {
    let boardState: BoardState = this.boardState.value;

    //  First column, can't remove further
    if (boardState.columnIndex === -1) return;

    let word = this.getCurrentWord(boardState);

    word.letters[boardState.columnIndex].value = "";

    --boardState.columnIndex;

    // marca para borrar cualquier error, ya que estaremos empujando lo observable
    boardState.error = "";

    this.boardState.next(boardState);
  }

  public appendInput(key: string): void {
    let boardState: BoardState = this.boardState.value;

    let maxColumnIndex = this.wordLength - 1;

   // Última columna, no se puede agregar más
    if (boardState.columnIndex === maxColumnIndex) return;

   // Sólo permite a los usuarios ingresar caracteres alfabéticos de la "a" a la "Z"
    let validInput: boolean = /^[a-zA-Z]$/.test(key);

    if (validInput) {
      ++boardState.columnIndex;

      let word = this.getCurrentWord(boardState);

      word.letters[boardState.columnIndex].value = key.toLocaleUpperCase();

      // marca para borrar cualquier error, ya que estaremos empujando lo observable
      boardState.error = "";

      this.boardState.next(boardState);
    }
  }

  private getCurrentWord(boardState: BoardState): Word {
    return boardState.words[boardState.rowIndex];
  }

  getUserGuess(): string {
    let boardState: BoardState = this.boardState.value;
    let userGuess: string = "";
    let letters = boardState.words[boardState.rowIndex].letters;

    for (let i = 0; i < letters.length; i++) {
      let letter = letters[i];

      userGuess += letter.value;
    }

    return userGuess;
  }

  public guess(): void {
    let timeOut: number = 100;

    // Da suficiente tiempo para que finalice la animación pendiente antes de intentar realizar la confirmación, lo que puede desencadenar otra animación
     // Si las animaciones chocan, el flip nunca se reproduce o ocurren otros comportamientos extraños
    window.setTimeout(() => {
      this.processGuess();
    }, timeOut);
  }

  private processGuess(): void {
    let boardState: BoardState = this.boardState.value;

    let guess = this.getUserGuess().toLocaleUpperCase();

    boardState.error = this.validate(guess);

    this.boardState.next(boardState);

    // El usuario ingresó una suposición no válida; no procese más
    if (boardState.error.length > 0) {
      return;
    }

    this.updateBoardState(guess);

    this.session.guesses.push(guess);

    this.updateSession();

    let gameStatus: GameStatus = this.getGameStatus();

    if (gameStatus !== GameStatus.Active) {
      this.endCurrentGame(gameStatus);
      this.updateSession();
    }
  }

  private updateBoardState(guess: string): void {
    let boardState: BoardState = this.boardState.value;
    let secret: string = this.session.secret;

    let secretWordLetters = secret.split('');
    let partialClues: string[] = [];
    let perfectClues: string[] = [];

    // Primero busca coincidencias perfectas: letra correcta en la posición correcta
    for (let i = 0; i < guess.length; i++) {
      let guessLetter = guess[i].trim();
      let correctLetter = secret[i];
      let boardStateLetter = boardState.words[boardState.rowIndex].letters[i];
      const index = secretWordLetters.indexOf(guessLetter);

      boardStateLetter.committed = guessLetter.length > 0;
      boardStateLetter.value = guessLetter;

      if (guessLetter === correctLetter) {
        boardStateLetter.perfect = true;
        perfectClues.push(guessLetter);
        secretWordLetters.splice(index, 1);
      }
    }

    // A continuación, busca coincidencias parciales: letra correcta en la posición incorrecta
     // Los bucles se realizan por separado para que no marquemos accidentalmente una palabra con múltiplos de la misma pista correcta dos veces; Palabra secreta "HUMANO" y adivina "AVIAR"
     // Ignora específicamente las letras marcadas como perfectas para no sobrescribir el estado perfecto; puede suceder cuando el secreto es FEDERAL y la suposición es FELLOWS
    for (let i = 0; i < guess.length; i++) {
      let guessLetter = guess[i];
      let boardStateLetter = boardState.words[boardState.rowIndex].letters[i];
      const index = secretWordLetters.indexOf(guessLetter);

      if (!boardStateLetter.perfect && index > -1) {
        partialClues.push(guessLetter);
        boardStateLetter.partial = true;
        secretWordLetters.splice(index, 1);
      }
    }

    this.keyboardService.registerKeys(guess, partialClues, perfectClues);

    // Pasar a la siguiente fila
    ++boardState.rowIndex;

    // Restablecer el índice de la columna
    boardState.columnIndex = -1;

    this.boardState.next(boardState);
  }

  private validate(guess: string): string {
    // Salir temprano si ganaron
    if (guess === this.session.secret) return "";

    let validGuessLength = this.validateGuessLength(guess);

    if (!validGuessLength) {
      return `No hay suficientes letras`;
    }

    if (this.guessedPreviously(guess)) {
      return "Ya adivinado";
    }

    let errorMessage = this.validateHardMode(guess);

    if (errorMessage.length > 0) {
      return errorMessage;
    }

    if (!this.dictionaryService.hasWord(guess)) {
      return "No esta en el diccionario o no existe";
    }

    return "";
  }

  private validateGuessLength(guess: string): boolean {

    if (!guess) return false;
    if (guess.trim() === "") return false;
    if (guess.length !== this.wordLength) return false;

    return true;
  }

  private validateHardMode(guess: string): string {
    //  no disponible
    if (!this.session.options.hardMode) return "";

    let boardState: BoardState = this.boardState.value;

    // Sin conjeturas previas
    if (boardState.rowIndex === 0) return "";

    let previousWord = boardState.words[boardState.rowIndex - 1];
    let partialClues = [];

    for (let i = 0; i < previousWord.letters.length; i++) {
      let letter = previousWord.letters[i];

      if (letter.perfect) {
        let guessLetter = guess[i];

        if (guessLetter !== letter.value) {
          let ordinalPosition = this.translateIndex(i);
          return `${ordinalPosition} la palabra debe ser ${letter.value}`;
        }
      }

      if (letter.partial) {
        partialClues.push(letter.value);
      }
    }

    for (let i = 0; i < guess.length; i++) {
      let letter = guess[i];
      let clueIndex = partialClues.indexOf(letter);

      if (clueIndex > -1) {
        partialClues.splice(clueIndex, 1);
      }
    }

    if (partialClues.length === 1) {
      return `Letra $ {parcialClues [0]} faltante de Guess`;
    }

    if (partialClues.length > 1) {
      return `Letras $ {parcialClues.Join (",")} Falta de Guess`;
    }

    return "";
  }

  /**
   * Traduce el índice dado a un ordinal.
   * @param index
   * @returns
   */
  private translateIndex(index: number): string {
    switch (index) {
      case 1:
        return "Segunda";
      case 2:
        return "Tercera";
      case 3:
        return "Cuarta";
      case 4:
        return "Quinta";
      case 5:
        return "Sexta";
      case 6:
        return "Séptima";
      default:
        return "Primera";
    }
  }

  private guessedPreviously(guess: string): boolean {
    let previousGuesses: string[] = this.session.guesses;

    return previousGuesses.includes(guess);
  }

  /** MISC */

  private updateSession(): void {
    let boardState: BoardState = this.boardState.value;

    this.sessionService.update(boardState);
    this.sessionService.save();
  }

  private resetTimer(): void {
    this.session.time = 0;
  }
}
