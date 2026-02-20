import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";

export interface StaticContent {
  title: string;
  content: string;
}

@Component({
  selector: "app-static-content-modal",
  templateUrl: "./static-content-modal.html",
  styleUrls: ["./static-content-modal.scss"],
})
export class StaticContentModalComponent implements OnInit {
  @Input() title: string = "";
  @Input() content: string = "";

  constructor(private modalController: ModalController) {}

  ngOnInit() {}

  close() {
    this.modalController.dismiss();
  }
}
