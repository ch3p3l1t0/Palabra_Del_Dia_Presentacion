import { Component, HostBinding, ViewChild } from '@angular/core';
import { BoardState, GameStatus } from './models/board-state.interface';
import { BoardStateService } from './services/board-state.service';
import { DictionaryService } from './services/dictionary.service';
import { SessionService } from './services/session.service';
import { MatDialog } from '@angular/material/dialog';
import { ResultsDialogComponent } from './components/results-dialog/results-dialog.component'
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { Session } from './models/session.interface';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { BaseURL, DarkModeClassName, ShareParameter, SiteName } from './constants';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { AboutComponent } from './components/about/about.component';
import { BehaviorSubject, combineLatest } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  // Se utiliza para cambiar entre temas en modo oscuro/claro.
  @HostBinding('class') className = '';
  @ViewChild('options') optionSideNav: MatSidenav;

 //  Puntos de vista
  showGame: boolean = true;
  showHistory: boolean = false;
  showStats: boolean = false;

  // Modo oscuro
  darkMode: boolean = false;

  // estado de la app
  gameDataLoaded: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  showError: boolean = false;
  boardState: BoardState;
  session: Session;
  gameOver: boolean = false;

  constructor(
    private dictionaryService: DictionaryService,
    sessionService: SessionService,
    private boardStateService: BoardStateService,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private activatedRoute: ActivatedRoute,
    private metaService: Meta,
    private titleService: Title,
    private bottomSheet: MatBottomSheet
  ) {
    this.setSiteTags();

    combineLatest([dictionaryService.initialized, sessionService.session]).subscribe(([dictionaryInit, session]) => {
      let gameDataLoaded: boolean = this.gameDataLoaded.value;

      if (!dictionaryInit) return;
      if (!session) return;

      this.session = session;

      this.darkMode = session.options.darkMode;

      this.className = this.darkMode ? DarkModeClassName : "";

      //  Solo quiero configurar esto una vez, ya que hará que comience el juego.
      if (!gameDataLoaded) {
        this.gameDataLoaded.next(true);
      }
    });

    this.boardStateService.boardState.subscribe(boardState => {
      if (!boardState) return;

      this.boardState = boardState;

      this.gameOver = this.boardState.gameStatus !== GameStatus.Active;

      if (this.gameOver) {
        this.openResultsDialog();
      }

      if (boardState.error.length > 0) {
        this.showErrorMessage(boardState.error);
      }
    });
  }

  ngOnInit(): void {
    this.gameDataLoaded.subscribe(init => {
      if (!init) return;

      //  Busque un enlace para compartir
      this.activatedRoute.queryParamMap.subscribe(params => {
        let shareLink = params.get(ShareParameter) || "";

        if (shareLink.length === 0) {
          //  Iniciar un juego normal
          this.boardStateService.initialize();
        } else {
          this.startSharedGame(shareLink);
        }

        //  Borrar el parámetro de URL
        window.history.pushState({}, document.title, "/");
      });
    });
  }

  startSharedGame(shareLink: string): void {
    let secret: string = "";

    //  Los enlaces mal formados pueden provocar una excepción en el navegador al decodificar
    try {
      secret = atob(shareLink);
    } catch (ex) {
      console.error(ex);
    }

    let secretValid: boolean = secret.length > 0 && this.dictionaryService.hasWord(secret);

    if (secretValid) {
      this.boardStateService.startSharedGame(secret);
    } else {
      console.warn("Share link copied incorrectly or word not found in dictionary. Previous session will be loaded instead.");
      this.showErrorMessage("Invalid share link");
      this.boardStateService.initialize();
    }
  }

  private setSiteTags(): void {
    //  Título
    this.titleService.setTitle(SiteName);

    //  juego de caracteres
    this.metaService.addTag({ charset: "utf-8" });

    //  Varias
    this.metaService.addTag({ name: "description", content: "A free, open source word puzzle game you can share with friends" });
    this.metaService.addTag({ name: "viewport", content: "webswidth=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0ite" });
    this.metaService.addTag({ name: "author", content: "Ben Schwenke" });
    this.metaService.addTag({ name: "twitter:card", content: "summary" });

    //  Abrir gráficos
    this.metaService.addTag({ property: "og:type", content: "website" });
    this.metaService.addTag({ property: "og:title", content: SiteName });
    this.metaService.addTag({ property: "og:description", content: "A free, open source word puzzle game you can share with friends" });
    this.metaService.addTag({ property: "og:url", content: BaseURL });
    this.metaService.addTag({ property: "og:image", content: "https://i.imgur.com/P5hzOI8.png" });
  }

  viewGame(): void {
    this.showHistory = false;
    this.showStats = false;
    this.showGame = true;
  }

  viewHistory(): void {
    if (this.showGame || this.showStats) {
      this.optionSideNav.toggle();
    }

    this.showGame = false;
    this.showStats = false;
    this.showHistory = true;
  }

  viewStats(): void {
    if (this.showGame || this.showHistory) {
      this.optionSideNav.toggle();
    }

    this.showGame = false;
    this.showHistory = false;
    this.showStats = true;
  }

  startNewGame(): void {
    this.optionSideNav.toggle();
    this.boardStateService.startNewGame();
  }

  concede(): void {
    this.optionSideNav.toggle();
    this.boardStateService.concede();
  }

  openResultsDialog(): void {
    const dialogRef = this.dialog.open(ResultsDialogComponent, {
      panelClass: this.className
    });

    dialogRef.afterClosed().subscribe(startNewGame => {
      if (startNewGame) {
        this.boardStateService.startNewGame();
      }
    });
  }

  showErrorMessage(errorMessage: string): void {
    //  ya lo muestro
    if (this.showError) return;

    this.showError = true;

    this.snackBar.open(errorMessage, "", { panelClass: ['error-snackbar'], verticalPosition: "top", horizontalPosition: "center", duration: 2000 });

    //  Dale tiempo a la animación para que se reproduzca y termine.
    setTimeout(() => {
      this.showError = false;
    }, 1000);
  }

  openAbout(): void {
    this.bottomSheet.open(AboutComponent, {});
  }
}
