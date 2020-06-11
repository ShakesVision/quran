import { Surah } from './surah';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SurahService {
    surahCollection: AngularFirestoreCollection <Surah>;
    currentSurah;

    constructor(private afs: AngularFirestore) {
        this.surahCollection = this.afs.collection<Surah>('surahs');
    }

    addSurah(item: Surah) {
        return this.surahCollection.add(item);
    }

    updateSurahById(id, item: Surah) {
        return this.surahCollection.doc(id).set(item);
    }

    getSurahs(): Observable<Surah[]> {
        return this.surahCollection.valueChanges({idField: 'id'});
    }

    getSurahById(id): Observable<Surah>{
        return this.surahCollection.doc<Surah>(id).valueChanges().pipe(take(1));
    }

    deleteSurahById(id) {
        return this.afs.doc<Surah>(`surahs/${id}`).delete();
    }
}

