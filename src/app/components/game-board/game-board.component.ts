import { Component, OnInit } from '@angular/core';
import { BoardStateService } from 'src/app/services/board-state.service';
import { BoardState, Letter } from 'src/app/models/board-state.interface';
import { SessionService } from 'src/app/services/session.service';
import { Options } from 'src/app/models/options.interface';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})

export class GameBoardComponent implements OnInit {
  boardState: BoardState;
  options: Options;

  constructor(
    boardStateService: BoardStateService,
    sessionService: SessionService
  ) {
    combineLatest([boardStateService.boardState, sessionService.session]).subscribe(([boardState, session]) => {
      this.boardState = boardState;
      this.options = session.options;
    });
  }

  ngOnInit(): void {

  }

  getTitle(letter: Letter): string {
    if (letter.perfect) {
      return `Perfecto: esta letra está en la palabra secreta y en la posición correcta.`;
    } else if (letter.partial) {
      return `Parcial: esta letra está en la palabra secreta, pero no en la posición correcta.`;
    } else if (letter.committed) {
      return `Sin usar: esta carta no forma parte de la palabra secreta.`;
    } else {
      return "";
    }
  }
}
