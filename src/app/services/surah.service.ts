import { Surah, Index } from './surah';
import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { map, take } from 'rxjs/operators';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SurahService {
    surahCollection: AngularFirestoreCollection <Surah>;
    indexCollection: AngularFirestoreCollection <Index>;
    currentSurah;

    constructor(private afs: AngularFirestore) {
        this.surahCollection = this.afs.collection<Surah>('surahs');
        this.indexCollection = this.afs.collection<Index>('index',ref=>ref.orderBy('surahNo'));
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
    
    addIndex(item: Index) {
        return this.indexCollection.add(item);
    }

    updateIndexById(id, item: Index) {
        return this.indexCollection.doc(id).set(item);
    }

    getIndexes(): Observable<Index[]> {
        return this.indexCollection.valueChanges({idField: 'id'});
    }

    getIndexById(id): Observable<Index>{
        return this.indexCollection.doc<Index>(id).valueChanges().pipe(take(1));
    }

    deleteIndexById(id) {
        return this.afs.doc<Index>(`index/${id}`).delete();
    }

    fetchIndexBySurahNumber(remoteId) {
        return this.afs.collection<Index>("index",ref => ref.where("remoteId", "==", remoteId));
    }
}

