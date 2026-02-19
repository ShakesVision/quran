import { Component } from '@angular/core';
import { Location } from '@angular/common';

import {
  Platform,
  ActionSheetController,
  AlertController,
  ModalController,
  PopoverController,
} from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private modalCtrl: ModalController,
    private popoverCtrl: PopoverController,
    private alertCtrl: AlertController,
    private actionSheetCtrl: ActionSheetController,
    private location: Location
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleLightContent();
      this.splashScreen.hide();
    });

    // Universal back button handler:
    // Dismiss any open overlay (modal → popover → alert → action sheet)
    // before allowing the default browser/app back navigation.
    // Priority 100 is below the modal-specific handler (200) but above default (0).
    this.platform.backButton.subscribeWithPriority(100, async (processNext) => {
      try {
        const modal = await this.modalCtrl.getTop();
        if (modal) { await modal.dismiss(); return; }

        const popover = await this.popoverCtrl.getTop();
        if (popover) { await popover.dismiss(); return; }

        const alert = await this.alertCtrl.getTop();
        if (alert) { await alert.dismiss(); return; }

        const actionSheet = await this.actionSheetCtrl.getTop();
        if (actionSheet) { await actionSheet.dismiss(); return; }
      } catch (_) {
        // Overlay controller threw — nothing to dismiss
      }

      // No overlay open — do normal back navigation
      processNext();
    });
  }
}
