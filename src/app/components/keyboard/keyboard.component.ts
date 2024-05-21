import { Component, HostListener, OnInit } from '@angular/core';
import { combineLatest } from 'rxjs';
import { BACKSPACE, ENTER } from 'src/app/constants';
import { BoardState, GameStatus } from 'src/app/models/board-state.interface';
import { Key, Keyboard } from 'src/app/models/keyboard.interface';
import { Options } from 'src/app/models/options.interface';
import { BoardStateService } from 'src/app/services/board-state.service';
import { KeyboardService } from 'src/app/services/keyboard.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-keyboard',
  templateUrl: './keyboard.component.html',
  styleUrls: ['./keyboard.component.scss']
})
export class KeyboardComponent implements OnInit {

  // constants
  enterKey: string = "Enter";
  backspaceKey: string = "Backspace";

  //  models
  keyboard: Keyboard = {} as Keyboard;
  boardState: BoardState = {} as BoardState;
  options: Options;

  constructor(
    keyboardService: KeyboardService,
    private boardStateService: BoardStateService,
    sessionService: SessionService
  ) {
    combineLatest([keyboardService.keyboard, boardStateService.boardState, sessionService.session]).subscribe(([keyboard, boardState, session]) => {
      this.keyboard = keyboard;
      this.boardState = boardState;
      this.options = session.options;
    });
  }

  ngOnInit(): void {

  }

  @HostListener('window:keydown', ['$event'])
  handleInput(event: KeyboardEvent): void {
    //  El juego no se está ejecutando: no acepte más clics del teclado
    if (this.boardState.gameStatus !== GameStatus.Active) return;

    if (event.key === this.enterKey) {
      this.boardStateService.guess();
    } else if (event.key === this.backspaceKey) {
      this.boardStateService.removeInput();
    } else {
      this.boardStateService.appendInput(event.key);
    }
  }

  keyClicked(key: Key): void {
    //  El juego no se está ejecutando: no acepte más clics del teclado
    if (this.boardState.gameStatus !== GameStatus.Active) return;
    if (key.letter === " ") return;

    if (key.letter === ENTER) {
      this.boardStateService.guess();
    } else if (key.letter === BACKSPACE) {
      this.boardStateService.removeInput();
    } else {
      this.boardStateService.appendInput(key.letter);
    }
  }

  getTitle(key: Key): string {
    if (key.letter === ENTER) {
      return "Envía tu suposición";
    }

    if (key.letter === BACKSPACE) {
      return "Elimina la letra más reciente de la suposición actual.";
    }

    if (key.perfect) {
      return "Esta letra está en la palabra secreta y se usó en la posición correcta.";
    } else if (key.partial) {
      return "Esta letra está en la palabra secreta, pero no en la posición correcta.";
    } else if (key.guessed) {
      return "Esta carta ha sido utilizada y no está en la palabra secreta.";
    } else {
      return "Esta carta aún no se ha utilizado.";
    }
  }

}
