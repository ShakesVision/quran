import { Component, OnInit } from "@angular/core";
import { applyTajweed } from "src/app/lib/tajweed";

interface FontOption {
  name: string;
  class: string;
  label: string;
}

@Component({
  selector: "app-tajweed",
  templateUrl: "./tajweed.page.html",
  styleUrls: ["./tajweed.page.scss"],
})
export class TajweedPage implements OnInit {
  arabicText: string = "";
  tajweedPreview: string = "";
  showPreview: boolean = false;

  // Font options
  fontOptions: FontOption[] = [
    { name: "muhammadi", class: "ar-text", label: "Muhammadi" },
    { name: "indopak", class: "ar-text2", label: "IndoPak" },
    { name: "traditional", class: "", label: "Traditional Arabic" },
  ];
  selectedFont: FontOption = this.fontOptions[0]; // Default to Muhammadi
  textareaFontClass: string = "ar-text"; // Default font for textarea
  previewFontClass: string = "ar-text"; // Default font for preview

  constructor() {}

  ngOnInit() {}

  /**
   * Apply tajweed highlighting to the input Arabic text
   */
  applyTajweedHighlighting() {
    if (!this.arabicText || this.arabicText.trim().length === 0) {
      this.tajweedPreview = "";
      this.showPreview = false;
      return;
    }

    try {
      this.tajweedPreview = applyTajweed(this.arabicText, "class");
      this.showPreview = true;
    } catch (error) {
      console.error("Error applying tajweed:", error);
      this.showPreview = false;
    }
  }

  /**
   * Change the font for both textarea and preview
   */
  changeFont(font: FontOption) {
    this.selectedFont = font;
    this.textareaFontClass = font.class;
    this.previewFontClass = font.class;
  }

  /**
   * Clear the input and preview
   */
  clearText() {
    this.arabicText = "";
    this.tajweedPreview = "";
    this.showPreview = false;
  }
}
