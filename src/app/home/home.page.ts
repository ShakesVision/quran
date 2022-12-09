import { Component } from "@angular/core";
import { ModalController } from "@ionic/angular";
import { ProgressPage } from "../pages/progress/progress.page";

@Component({
  selector: "app-home",
  templateUrl: "home.page.html",
  styleUrls: ["home.page.scss"],
})
export class HomePage {
  constructor(private modalController: ModalController) {}
  ngOnInit() {}
  async open(name) {
    const modal = await this.modalController.create({
      component: ProgressPage,
      componentProps: { name },
      swipeToClose: true,
      mode: "ios",
    });
    modal.present();
  }
  darkModeToggle() {
    document.body.classList.toggle("dark");
  }
}
