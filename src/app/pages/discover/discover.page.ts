import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Platform, GestureController, Gesture, ActionSheetController } from '@ionic/angular';
import { AyahCard } from '../../models/ayah-card';
import { QuranDataService, TranslationResource, AVAILABLE_TRANSLATIONS } from '../../services/quran-data.service';

@Component({
  selector: 'app-discover',
  templateUrl: './discover.page.html',
  styleUrls: ['./discover.page.scss'],
})
export class DiscoverPage implements OnInit, OnDestroy {
  @ViewChild('cardContainer', { static: false }) cardContainer!: ElementRef;

  cards: AyahCard[] = [];
  currentIndex = 0;
  isLoading = true;
  isTransitioning = false;
  swipeDirection: 'up' | 'down' | null = null;
  showShareToast = false;
  showSettings = false;

  /** Translation config */
  englishTranslations: TranslationResource[] = [];
  urduTranslations: TranslationResource[] = [];
  selectedEnId: number = 20;
  selectedUrId: number = 97;
  currentEnName: string = '';
  currentUrName: string = '';

  /** For touch/swipe tracking */
  private swipeGesture: Gesture | null = null;
  private touchStartY = 0;
  private currentTranslateY = 0;
  private SWIPE_THRESHOLD = 60;

  /** Pre-load buffer: how many cards ahead to keep loaded */
  private readonly BUFFER_SIZE = 5;
  private readonly INITIAL_LOAD = 8;

  constructor(
    private quranDataService: QuranDataService,
    private router: Router,
    private platform: Platform,
    private gestureCtrl: GestureController,
    private cdr: ChangeDetectorRef,
    private actionSheetCtrl: ActionSheetController
  ) {}

  async ngOnInit() {
    this.isLoading = true;

    // Load translation options and current preferences (only cached ones for Discover)
    this.englishTranslations = this.quranDataService.getAvailableTranslations('english', true);
    this.urduTranslations = this.quranDataService.getAvailableTranslations('urdu', true);
    this.selectedEnId = this.quranDataService.getSelectedEnTranslationId();
    this.selectedUrId = this.quranDataService.getSelectedUrTranslationId();
    this.currentEnName = this.quranDataService.getTranslationName(this.selectedEnId);
    this.currentUrName = this.quranDataService.getTranslationName(this.selectedUrId);

    const ready = await this.quranDataService.isAyahDataReady();
    if (!ready) {
      // Data not yet cached, try to cache now
      await this.quranDataService.preCacheQuranData();
    }

    const initialCards = await this.quranDataService.getRandomAyahCards(this.INITIAL_LOAD);
    if (initialCards.length > 0) {
      this.cards = initialCards;
      this.isLoading = false;
      this.cdr.detectChanges();

      // Set up swipe gesture after view is ready
      setTimeout(() => this.setupGesture(), 100);
    } else {
      this.isLoading = false;
    }
  }

  ngOnDestroy() {
    if (this.swipeGesture) {
      this.swipeGesture.destroy();
    }
  }

  /**
   * Set up vertical swipe gesture
   */
  private setupGesture() {
    const el = this.cardContainer?.nativeElement;
    if (!el) return;

    this.swipeGesture = this.gestureCtrl.create({
      el,
      gestureName: 'ayah-swipe',
      direction: 'y',
      threshold: 10,
      onStart: () => {
        this.currentTranslateY = 0;
      },
      onMove: (ev) => {
        if (this.isTransitioning) return;
        this.currentTranslateY = ev.deltaY;

        // Apply live transform for drag feedback
        const currentCard = el.querySelector('.card-slide.active');
        if (currentCard) {
          const clampedDelta = Math.max(-150, Math.min(150, ev.deltaY));
          (currentCard as HTMLElement).style.transform = `translateY(${clampedDelta}px)`;
          (currentCard as HTMLElement).style.opacity = `${1 - Math.abs(clampedDelta) / 400}`;
        }
      },
      onEnd: (ev) => {
        if (this.isTransitioning) return;

        const currentCard = el.querySelector('.card-slide.active') as HTMLElement;

        if (Math.abs(this.currentTranslateY) > this.SWIPE_THRESHOLD) {
          if (this.currentTranslateY < 0) {
            // Swipe UP → next ayah
            this.goNext(currentCard);
          } else {
            // Swipe DOWN → previous ayah
            this.goPrevious(currentCard);
          }
        } else {
          // Snap back
          if (currentCard) {
            currentCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
            currentCard.style.transform = 'translateY(0)';
            currentCard.style.opacity = '1';
            setTimeout(() => {
              currentCard.style.transition = '';
            }, 300);
          }
        }
      },
    });

    this.swipeGesture.enable(true);
  }

  /**
   * Navigate to next ayah card (swipe up)
   */
  async goNext(currentCard?: HTMLElement) {
    if (this.isTransitioning || this.currentIndex >= this.cards.length - 1) {
      // Load more cards if near the end
      if (this.currentIndex >= this.cards.length - 2) {
        await this.loadMoreCards();
      }
      if (this.currentIndex >= this.cards.length - 1) {
        this.snapBack(currentCard);
        return;
      }
    }

    this.isTransitioning = true;
    this.swipeDirection = 'up';

    if (currentCard) {
      currentCard.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
      currentCard.style.transform = 'translateY(-100%)';
      currentCard.style.opacity = '0';
    }

    setTimeout(() => {
      this.currentIndex++;
      this.isTransitioning = false;
      this.swipeDirection = null;
      this.cdr.detectChanges();

      // Reset transform on new active card
      const el = this.cardContainer?.nativeElement;
      const newActive = el?.querySelector('.card-slide.active') as HTMLElement;
      if (newActive) {
        newActive.style.transition = '';
        newActive.style.transform = 'translateY(0)';
        newActive.style.opacity = '1';
      }

      // Pre-load more if nearing end
      if (this.currentIndex >= this.cards.length - 3) {
        this.loadMoreCards();
      }
    }, 350);
  }

  /**
   * Navigate to previous ayah card (swipe down)
   */
  goPrevious(currentCard?: HTMLElement) {
    if (this.isTransitioning || this.currentIndex <= 0) {
      this.snapBack(currentCard);
      return;
    }

    this.isTransitioning = true;
    this.swipeDirection = 'down';

    if (currentCard) {
      currentCard.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
      currentCard.style.transform = 'translateY(100%)';
      currentCard.style.opacity = '0';
    }

    setTimeout(() => {
      this.currentIndex--;
      this.isTransitioning = false;
      this.swipeDirection = null;
      this.cdr.detectChanges();

      const el = this.cardContainer?.nativeElement;
      const newActive = el?.querySelector('.card-slide.active') as HTMLElement;
      if (newActive) {
        newActive.style.transition = '';
        newActive.style.transform = 'translateY(0)';
        newActive.style.opacity = '1';
      }
    }, 350);
  }

  /**
   * Snap card back to position
   */
  private snapBack(card?: HTMLElement) {
    if (card) {
      card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      card.style.transform = 'translateY(0)';
      card.style.opacity = '1';
      setTimeout(() => {
        card.style.transition = '';
      }, 300);
    }
  }

  /**
   * Load more random ayah cards
   */
  private async loadMoreCards() {
    const newCards = await this.quranDataService.getRandomAyahCards(this.BUFFER_SIZE);
    this.cards = [...this.cards, ...newCards];
  }

  /**
   * Get current card
   */
  get currentCard(): AyahCard | null {
    return this.cards[this.currentIndex] || null;
  }

  /**
   * Share the current ayah
   */
  async shareAyah() {
    const card = this.currentCard;
    if (!card) return;

    const shareText = `${card.arabicText}\n\n${card.englishTranslation}\n\n— Surah ${card.surahNameEn} (${card.verseKey})\n\nvia Quran Hifz Helper by Shakeeb Ahmad\nhttps://ur.shakeeb.in`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Quran - ${card.surahNameEn} ${card.verseKey}`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        this.copyToClipboard(shareText);
      }
    } else {
      this.copyToClipboard(shareText);
    }
  }

  /**
   * Copy to clipboard fallback
   */
  private async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.showShareToast = true;
      setTimeout(() => (this.showShareToast = false), 2000);
    } catch {
      // Ignore
    }
  }

  /**
   * Navigate to read this ayah in full context
   */
  openInReader() {
    const card = this.currentCard;
    if (!card) return;
    this.router.navigate(['/surah', card.surahNumber, 'ayah', card.ayahNumber]);
  }

  /**
   * Go back to home
   */
  goBack() {
    this.router.navigate(['/']);
  }

  /**
   * Keyboard navigation support
   */
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowUp' || event.key === 'k') {
      this.goPrevious();
    } else if (event.key === 'ArrowDown' || event.key === 'j') {
      this.goNext();
    } else if (event.key === 'Escape') {
      if (this.showSettings) {
        this.showSettings = false;
      } else {
        this.goBack();
      }
    }
  }

  /**
   * Toggle settings panel
   */
  toggleSettings() {
    this.showSettings = !this.showSettings;
    this.cdr.detectChanges();
  }

  /**
   * Open English translation picker
   */
  async pickEnglishTranslation() {
    const buttons = this.englishTranslations.map(t => ({
      text: `${t.name}${t.id === this.selectedEnId ? ' ✓' : ''}`,
      cssClass: t.id === this.selectedEnId ? 'selected-translation' : '',
      handler: () => {
        this.selectEnTranslation(t.id);
      }
    }));
    buttons.push({ text: 'Cancel', cssClass: 'action-sheet-cancel', handler: () => {} });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'English Translation',
      subHeader: 'Select your preferred English translation',
      cssClass: 'translation-picker',
      buttons,
    });
    await actionSheet.present();
  }

  /**
   * Open Urdu translation picker
   */
  async pickUrduTranslation() {
    const buttons = this.urduTranslations.map(t => ({
      text: `${t.name}${t.id === this.selectedUrId ? ' ✓' : ''}`,
      cssClass: t.id === this.selectedUrId ? 'selected-translation' : '',
      handler: () => {
        this.selectUrTranslation(t.id);
      }
    }));
    buttons.push({ text: 'Cancel', cssClass: 'action-sheet-cancel', handler: () => {} });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Urdu Translation',
      subHeader: 'اردو ترجمہ منتخب کریں',
      cssClass: 'translation-picker',
      buttons,
    });
    await actionSheet.present();
  }

  /**
   * Apply selected English translation
   */
  async selectEnTranslation(resourceId: number) {
    this.selectedEnId = resourceId;
    this.currentEnName = this.quranDataService.getTranslationName(resourceId);
    await this.quranDataService.setEnTranslation(resourceId);
    // Rebuild visible cards with new translation
    await this.rebuildCardsWithNewTranslation();
    this.cdr.detectChanges();
  }

  /**
   * Apply selected Urdu translation
   */
  async selectUrTranslation(resourceId: number) {
    this.selectedUrId = resourceId;
    this.currentUrName = this.quranDataService.getTranslationName(resourceId);
    await this.quranDataService.setUrTranslation(resourceId);
    // Rebuild visible cards with new translation
    await this.rebuildCardsWithNewTranslation();
    this.cdr.detectChanges();
  }

  /**
   * Reload cards with the new translation preferences
   */
  private async rebuildCardsWithNewTranslation() {
    const newCards = await this.quranDataService.getRandomAyahCards(this.INITIAL_LOAD);
    if (newCards.length > 0) {
      this.cards = newCards;
      this.currentIndex = 0;
      this.cdr.detectChanges();
    }
  }
}

