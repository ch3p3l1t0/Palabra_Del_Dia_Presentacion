import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, OnInit } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { DarkModeClassName } from 'src/app/constants';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  darkMode: boolean = false;
  gameTime: string = "";

  constructor(
    private bottomSheetRef: MatBottomSheetRef<AboutComponent>,
    sessionService: SessionService,
    private overlayContainer: OverlayContainer
  ) {
    sessionService.session.subscribe(session => {
      this.darkMode = session.options.darkMode;
      this.gameTime = sessionService.formatClockTime(session.time);
    });

    bottomSheetRef.afterDismissed().subscribe(val => {
      //  Elimine la clase DarkMode de la superposición si está allí, ya que esto hace que el renderice incorrectamente
      this.overlayContainer.getContainerElement().classList.remove(DarkModeClassName);
    });
  }

  ngOnInit(): void {
    if (this.darkMode) {
      this.overlayContainer.getContainerElement().classList.add(DarkModeClassName);
    } else {
      this.overlayContainer.getContainerElement().classList.remove(DarkModeClassName);
    }
  }

  closePanel(): void {
    this.bottomSheetRef.dismiss();
  }
}
