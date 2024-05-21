import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { combineLatest } from 'rxjs';
import { ThreeStarSymbol, TwoStarSymbol, GreenBlock, GreyBlock, OneStarSymbol, YellowBlock, BaseURL, ShareParameter, MaxGuesses } from 'src/app/constants';
import { BoardState, GameStatus, Letter } from 'src/app/models/board-state.interface';
import { Options } from 'src/app/models/options.interface';
import { Session } from 'src/app/models/session.interface';
import { BoardStateService } from 'src/app/services/board-state.service';
import { SessionService } from 'src/app/services/session.service';
@Component({
  selector: 'app-results-dialog',
  templateUrl: './results-dialog.component.html',
  styleUrls: ['./results-dialog.component.scss']
})

export class ResultsDialogComponent implements OnInit {

  boardState: BoardState;
  session: Session;
  message: string = "";
  timeSpent: string = "";
  mode: string = "Default";

  // estado del botón
  shareButtonText: string = "Compartir";
  shareButtonClicked: boolean = false;

  constructor(
    boardStateService: BoardStateService,
    private sessionService: SessionService,
    public dialogRef: MatDialogRef<ResultsDialogComponent>
  ) {
    combineLatest([boardStateService.boardState, sessionService.session]).subscribe(([boardState, session]) => {
      this.boardState = boardState;
      this.session = session;
      this.timeSpent = this.sessionService.formatClockTime(session.time);
      this.setMessage();
    });
  }

  ngOnInit(): void {

  }

  private setMessage(): void {
    if (this.boardState.gameStatus === GameStatus.Completed) {
      this.message = `¡Felicitaciones! Adivinaste la palabra secreta ${this.session.secret}`;
    } else {
      this.message = `¡Demasiado! No pudo adivinar la palabra secreta ${this.session.secret}`;
    }
  }

  public reset(): void {
    this.dialogRef.close(true);
  }

  public share(): void {
    let clipboardText: string = this.getResultsText();

    this.writeToClipboard(clipboardText);

    this.shareButtonText = "¡Compartir enlace copiado!"
    this.shareButtonClicked = true;
  }

  private getResultsText(): string {
    let message: string = this.getResultsHeader();

   // Generar la junta de emojis
    for (let i = 0; i < this.boardState.rowIndex; i++) {
      let word = this.boardState.words[i];

      for (let k = 0; k < word.letters.length; k++) {
        let letter = word.letters[k];

        message += this.getBlock(letter);
      }

      message += "\n";
    }

// Recorte el final
    message = message.trim();

    return message;
  }

  private getResultsHeader(): string {
    let secret: string = this.session.secret;
    let modeOptions: string = this.getModeOptionString();
    let guessesMade: string = this.boardState.gameStatus === GameStatus.Completed ? `${this.boardState.rowIndex}` : "X";
    let messageHeader: string = "";

    let shareLink: string = this.sessionService.getShareLink(secret);
    let questionMarks: string = "".padEnd(secret.length, "?");
    messageHeader += `${shareLink}\n`;
    messageHeader += `${questionMarks} (${guessesMade}/${MaxGuesses}) ${modeOptions}\n`;

    return messageHeader;
  }

  private getModeOptionString(): string {
    let options: Options = this.session.options;

    if (options.hardMode && options.extremeMode) return ThreeStarSymbol;
    if (options.extremeMode) return TwoStarSymbol;
    if (options.hardMode) return OneStarSymbol;

    return "";
  }

  private writeToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  private getBlock(letter: Letter): string {
    if (letter.perfect) {
      return GreenBlock;
    } else if (letter.partial) {
      return YellowBlock;
    } else {
      return GreyBlock;
    }
  }

}
