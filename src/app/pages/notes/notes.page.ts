import { Component, OnInit, ViewChild } from "@angular/core";
import { AlertController, IonModal, ToastController } from "@ionic/angular";
import { AppDataService } from "src/app/services/app-data.service";
import { NoteEntry } from "src/app/models/app-data";

@Component({
  selector: "app-notes",
  templateUrl: "./notes.page.html",
  styleUrls: ["./notes.page.scss"],
})
export class NotesPage implements OnInit {
  @ViewChild("editModal") editModal!: IonModal;

  notes: NoteEntry[] = [];
  searchQuery: string = "";
  filteredNotes: NoteEntry[] = [];
  selectedNote: NoteEntry | null = null;
  editingTitle: string = "";
  editingContent: string = "";
  isLoading: boolean = false;

  constructor(
    private appDataService: AppDataService,
    private alertController: AlertController,
    private toastController: ToastController,
  ) {}

  ngOnInit() {
    this.loadNotes();
  }

  /**
   * Load all notes from AppDataService
   */
  async loadNotes() {
    this.isLoading = true;
    try {
      const appData = await this.appDataService.getAppData();
      this.notes = appData.notes || [];
      this.filterNotes();
    } catch (error) {
      console.error("Error loading notes:", error);
      await this.showToast("Error loading notes", "danger");
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Filter notes based on search query
   */
  filterNotes() {
    if (!this.searchQuery || this.searchQuery.trim().length === 0) {
      this.filteredNotes = [...this.notes].sort((a, b) => {
        // Sort by most recent first
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredNotes = this.notes
        .filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query),
        )
        .sort((a, b) => {
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        });
    }
  }

  /**
   * Open note for editing
   */
  openNote(note: NoteEntry) {
    this.selectedNote = note;
    this.editingTitle = note.title;
    this.editingContent = note.content;
    this.editModal.present();
  }

  /**
   * Save edited note
   */
  async saveNote() {
    if (!this.selectedNote) return;

    const title = this.editingTitle.trim();
    const content = this.editingContent.trim();

    if (!title || !content) {
      await this.showToast("Title and content cannot be empty", "warning");
      return;
    }

    try {
      const appData = await this.appDataService.getAppData();
      const noteIndex = appData.notes.findIndex(
        (n) => n.id === this.selectedNote!.id,
      );

      if (noteIndex >= 0) {
        appData.notes[noteIndex].title = title;
        appData.notes[noteIndex].content = content;
        appData.notes[noteIndex].updatedAt = new Date().toISOString();
        await this.appDataService.saveAppData(appData);
        await this.showToast("Note updated successfully", "success");
        await this.editModal.dismiss();
        await this.loadNotes();
      }
    } catch (error) {
      console.error("Error saving note:", error);
      await this.showToast("Error saving note", "danger");
    }
  }

  /**
   * Delete a note with confirmation
   */
  async deleteNote(note: NoteEntry) {
    const alert = await this.alertController.create({
      header: "Delete Note",
      message: `Are you sure you want to delete "${note.title}"?`,
      buttons: [
        {
          text: "Cancel",
          role: "cancel",
        },
        {
          text: "Delete",
          role: "destructive",
          handler: async () => {
            try {
              const appData = await this.appDataService.getAppData();
              appData.notes = appData.notes.filter((n) => n.id !== note.id);
              await this.appDataService.saveAppData(appData);
              await this.showToast("Note deleted", "success");
              await this.loadNotes();
            } catch (error) {
              console.error("Error deleting note:", error);
              await this.showToast("Error deleting note", "danger");
            }
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Show a toast message
   */
  private async showToast(message: string, color: string = "primary") {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 2000,
      position: "bottom",
    });
    await toast.present();
  }
}
