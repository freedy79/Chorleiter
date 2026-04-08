import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MaterialModule } from '@modules/material.module';
import { TrainingService } from '@core/services/training.service';
import { Exercise, AttemptResult, MODULE_LABELS, DIFFICULTY_LABELS } from '@core/models/training';

type ExercisePhase = 'loading' | 'ready' | 'playing' | 'result';

@Component({
  selector: 'app-exercise-player',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule],
  templateUrl: './exercise-player.component.html',
  styleUrls: ['./exercise-player.component.scss']
})
export class ExercisePlayerComponent implements OnInit, OnDestroy {
  exercise: Exercise | null = null;
  phase: ExercisePhase = 'loading';
  error: string | null = null;
  moduleLabels = MODULE_LABELS;
  difficultyLabels = DIFFICULTY_LABELS;

  // Rhythm Tap state
  tapTimes: number[] = [];
  isMetronomeRunning = false;
  currentBeat = 0;
  metronomeInterval: any = null;
  startTime = 0;

  // Recognition state
  selectedOption: string | null = null;
  isCorrect: boolean | null = null;
  recognitionAnswered = false;
  isPlayingRhythm = false;
  recognitionRoundIndex = 0;
  recognitionAnswers: { correct: boolean }[] = [];
  currentRound: any = null;

  // Note naming state
  currentNoteIndex = 0;
  noteAnswers: { correct: boolean; note: string; answer: string }[] = [];
  noteOptions: string[] = [];
  currentNote: any = null;

  // Interval hearing state
  currentIntervalIndex = 0;
  intervalAnswers: { correct: boolean }[] = [];
  currentInterval: any = null;

  // Scale hearing state
  scaleAnswers: { correct: boolean }[] = [];
  currentScaleIndex = 0;
  isPlayingScale = false;

  // Key signature state
  keySignatureAnswers: { correct: boolean }[] = [];
  currentKeyIndex = 0;
  currentKeySignature: any = null;

  // Interval reading state
  currentIntervalReadingIndex = 0;
  intervalReadingAnswers: { correct: boolean }[] = [];
  currentIntervalPair: any = null;

  // Unified answer feedback
  answerFeedback: {
    show: boolean;
    isCorrect: boolean;
    correctAnswer: string;
    givenAnswer: string;
  } = { show: false, isCorrect: false, correctAnswer: '', givenAnswer: '' };

  // Timer
  exerciseStartTime = 0;
  exerciseDuration = 0;

  // Result
  result: AttemptResult | null = null;
  isSubmitting = false;

  // Audio
  private audioContext: AudioContext | null = null;

  // Staff rendering constants
  readonly staffLineIndices = [0, 1, 2, 3, 4];
  private readonly STAFF_TOP_Y = 20;
  private readonly LINE_SPACING = 10;
  private readonly STEP = 5; // px per staff half-step

  private destroy$ = new Subject<void>();

  constructor(
    private trainingService: TrainingService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadExercise(id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopMetronome();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private loadExercise(id: string): void {
    this.phase = 'loading';
    this.trainingService.getExercise(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (exercise) => {
        this.exercise = exercise;
        this.phase = 'ready';
        this.prepareExercise();
      },
      error: () => {
        this.error = 'Übung konnte nicht geladen werden.';
        this.phase = 'loading';
      }
    });
  }

  private prepareExercise(): void {
    if (!this.exercise) return;

    if (this.exercise.type === 'name_note') {
      const allNotes = ['c', 'd', 'e', 'f', 'g', 'a', 'h'];
      this.noteOptions = allNotes;
      this.shuffleNotes();
    }

    if (this.exercise.type === 'interval_hearing') {
      this.initAudio();
      this.prepareIntervalSequence();
    }

    if (this.exercise.type === 'rhythm_recognition') {
      this.recognitionRoundIndex = 0;
      this.recognitionAnswers = [];
      this.setCurrentRound();
    }

    if (this.exercise.type === 'scale_hearing') {
      this.initAudio();
      this.prepareScaleSequence();
    }

    if (this.exercise.type === 'key_signature') {
      this.prepareKeySignatureSequence();
    }

    if (this.exercise.type === 'interval_reading') {
      this.prepareIntervalReadingSequence();
    }
  }

  private shuffleNotes(): void {
    if (!this.exercise?.content?.notes) return;
    const notes = [...this.exercise.content.notes];
    // Fisher-Yates shuffle
    for (let i = notes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [notes[i], notes[j]] = [notes[j], notes[i]];
    }
    this.exercise.content._shuffledNotes = notes;
    this.currentNote = notes[0];
    this.currentNoteIndex = 0;
    this.noteAnswers = [];
  }

  startExercise(): void {
    this.phase = 'playing';
    this.exerciseStartTime = Date.now();
    this.tapTimes = [];
    this.selectedOption = null;
    this.isCorrect = null;
    this.recognitionAnswered = false;

    if (this.exercise?.type === 'tap_rhythm') {
      this.startMetronome();
    }
    if (this.exercise?.type === 'rhythm_recognition') {
      this.setCurrentRound();
      this.playRecognitionRhythm();
    }
    if (this.exercise?.type === 'scale_hearing') {
      this.playScale();
    }
  }

  private setCurrentRound(): void {
    if (!this.exercise?.content) return;
    const rounds = this.exercise.content.rounds;
    if (rounds && rounds.length > 0) {
      this.currentRound = rounds[this.recognitionRoundIndex % rounds.length];
    } else {
      // Legacy single-round format
      this.currentRound = {
        correctPattern: this.exercise.content.correctPattern,
        options: this.exercise.content.options
      };
    }
  }

  // === RHYTHM RECOGNITION PLAYBACK ===
  playRecognitionRhythm(): void {
    if (!this.currentRound?.correctPattern || this.isPlayingRhythm) return;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const bpm = this.exercise?.content?.bpm || 80;
    const beatDuration = 60000 / bpm;
    const pattern = this.currentRound.correctPattern;
    this.isPlayingRhythm = true;

    let currentTime = 0;
    for (const note of pattern) {
      const durationBeats = this.getNoteDurationBeats(note.type);
      if (!note.type.startsWith('rest')) {
        const clickTime = currentTime;
        setTimeout(() => this.playClick(), clickTime);
      }
      currentTime += durationBeats * beatDuration;
    }
    setTimeout(() => this.isPlayingRhythm = false, currentTime + 200);
  }

  private getNoteDurationBeats(type: string): number {
    switch (type) {
      case 'whole': case 'rest_whole': return 4;
      case 'dotted_half': return 3;
      case 'half': case 'rest_half': return 2;
      case 'dotted_quarter': return 1.5;
      case 'quarter': case 'rest_quarter': return 1;
      case 'dotted_eighth': return 0.75;
      case 'eighth': case 'rest_eighth': return 0.5;
      case 'sixteenth': case 'rest_sixteenth': return 0.25;
      case 'triplet_eighth': return 1 / 3;
      default: return 1;
    }
  }

  // === TAP RHYTHM ===
  onTap(): void {
    if (this.phase !== 'playing' || this.exercise?.type !== 'tap_rhythm') return;
    const tapTime = Date.now() - this.startTime;
    this.tapTimes.push(tapTime);

    this.playClick();

    const expectedTaps = this.exercise.content.pattern.filter(
      (p: any) => !p.type.startsWith('rest')
    ).length;

    if (this.tapTimes.length >= expectedTaps) {
      this.finishTapRhythm();
    }
  }

  private startMetronome(): void {
    if (!this.exercise?.content) return;
    const bpm = this.exercise.content.bpm || 80;
    const beatInterval = 60000 / bpm;
    const bars = this.exercise.content.bars || 2;
    const countInBeats = 4; // One bar count-in

    this.currentBeat = -countInBeats;
    this.isMetronomeRunning = true;

    this.metronomeInterval = setInterval(() => {
      this.currentBeat++;

      if (this.currentBeat <= 0) {
        this.playMetronomeClick(this.currentBeat === -countInBeats + 1);
      } else if (this.currentBeat === 1) {
        this.startTime = Date.now();
        this.playMetronomeClick(true);
      } else {
        this.playMetronomeClick(false);
      }

      const totalBeats = bars * 4 + 2;
      if (this.currentBeat > totalBeats) {
        this.stopMetronome();
        if (this.tapTimes.length > 0) {
          this.finishTapRhythm();
        }
      }
    }, beatInterval);
  }

  private stopMetronome(): void {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
    this.isMetronomeRunning = false;
  }

  private finishTapRhythm(): void {
    this.stopMetronome();
    if (!this.exercise?.content) return;

    const pattern = this.exercise.content.pattern.filter(
      (p: any) => !p.type.startsWith('rest')
    );
    const bpm = this.exercise.content.bpm || 80;
    const beatDuration = 60000 / bpm;
    const tolerance = this.exercise.content.toleranceMs || 250;

    const totalExpected = pattern.length;
    if (this.tapTimes.length === 0 || totalExpected === 0) {
      this.submitResult(0, 0);
      return;
    }

    // Compensate for audio latency: use the offset of the first tap
    // from its expected beat as the systematic latency
    const firstExpected = (pattern[0].beat - 1) * beatDuration;
    const latencyOffset = this.tapTimes[0] - firstExpected;

    let correctTaps = 0;
    const diffs: number[] = [];

    for (let i = 0; i < Math.min(this.tapTimes.length, totalExpected); i++) {
      const expectedTime = (pattern[i].beat - 1) * beatDuration;
      const diff = Math.abs(this.tapTimes[i] - latencyOffset - expectedTime);
      diffs.push(Math.round(diff));
      if (diff <= tolerance) {
        correctTaps++;
      } else if (diff <= tolerance * 1.5) {
        correctTaps += 0.5;
      }
    }

    const score = Math.round((correctTaps / totalExpected) * 100);
    const accuracy = score;
    console.log('[TapRhythm] bpm:', bpm, 'latencyOffset:', Math.round(latencyOffset),
      'ms, diffs:', diffs, 'score:', score);
    this.submitResult(score, accuracy);
  }

  // === RHYTHM RECOGNITION ===
  selectOption(optionId: string): void {
    if (this.recognitionAnswered || !this.currentRound) return;
    this.selectedOption = optionId;
    this.recognitionAnswered = true;

    const correct = this.currentRound.options.find(
      (o: any) => o.id === optionId
    )?.correct;
    this.isCorrect = !!correct;
    this.recognitionAnswers.push({ correct: !!correct });

    const rounds = this.exercise?.content?.rounds;
    const totalRounds = rounds ? rounds.length : 1;

    if (this.recognitionAnswers.length >= totalRounds) {
      // All rounds done — calculate overall score
      const correctCount = this.recognitionAnswers.filter(a => a.correct).length;
      const score = Math.round((correctCount / totalRounds) * 100);
      setTimeout(() => this.submitResult(score, score), 1500);
    } else {
      // Next round after brief feedback
      setTimeout(() => {
        this.recognitionRoundIndex++;
        this.selectedOption = null;
        this.isCorrect = null;
        this.recognitionAnswered = false;
        this.setCurrentRound();
        this.playRecognitionRhythm();
      }, 1500);
    }
  }

  get recognitionProgress(): string {
    const rounds = this.exercise?.content?.rounds;
    if (!rounds || rounds.length <= 1) return '';
    return `${this.recognitionAnswers.length + 1} / ${rounds.length}`;
  }

  // === NOTE NAMING ===
  selectNoteAnswer(answer: string): void {
    if (!this.exercise?.content || !this.currentNote || this.answerFeedback.show) return;

    const correctName = this.currentNote.display.charAt(0).toLowerCase();
    const isCorrect = this.currentNote.display.toLowerCase().startsWith(answer);
    this.noteAnswers.push({
      correct: isCorrect,
      note: this.currentNote.display,
      answer
    });

    const notes = this.exercise.content._shuffledNotes || this.exercise.content.notes;
    const count = this.exercise.content.count || notes.length;

    const advance = () => {
      if (this.noteAnswers.length >= count) {
        const score = Math.round(
          (this.noteAnswers.filter(a => a.correct).length / this.noteAnswers.length) * 100
        );
        this.submitResult(score, score);
      } else {
        this.currentNoteIndex++;
        if (this.currentNoteIndex < notes.length) {
          this.currentNote = notes[this.currentNoteIndex];
        } else {
          this.currentNoteIndex = 0;
          this.currentNote = notes[0];
        }
      }
    };

    this.showFeedbackAndAdvance(isCorrect, correctName.toUpperCase(), answer.toUpperCase(), advance);
  }

  // === INTERVAL HEARING ===
  private _intervalSequence: any[] = [];

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  private prepareIntervalSequence(): void {
    if (!this.exercise?.content) return;
    const content = this.exercise.content;
    const source = content.type === 'chord_quality' ? content.chords : content.intervals;
    if (!source || source.length === 0) return;

    const count = content.count || source.length;
    const sequence: any[] = [];
    for (let i = 0; i < count; i++) {
      sequence.push(source[Math.floor(Math.random() * source.length)]);
    }
    this._intervalSequence = sequence;
    this.currentIntervalIndex = 0;
    this.intervalAnswers = [];
  }

  playInterval(): void {
    if (!this.exercise?.content || !this.audioContext) return;
    if (this.currentIntervalIndex >= this._intervalSequence.length) return;

    const content = this.exercise.content;
    const item = this._intervalSequence[this.currentIntervalIndex];

    if (content.type === 'chord_quality') {
      const playback = content.playback || 'default';
      if (playback === 'arpeggio_then_chord') {
        this.playArpeggioThenChord(item.notes);
      } else if (playback === 'chord_only') {
        this.playChord(item.notes);
      } else {
        // Default: arpeggio then chord
        this.playArpeggioThenChord(item.notes);
      }
    } else {
      this.currentInterval = item;
      const direction = content.direction || 'ascending';
      const baseFreq = this.noteToFreq(content.baseNote || 'C4');

      if (direction === 'descending') {
        const targetFreq = baseFreq / Math.pow(2, item.semitones / 12);
        this.playTone(baseFreq, 0.6);
        setTimeout(() => this.playTone(targetFreq, 0.6), 700);
      } else if (direction === 'harmonic') {
        const targetFreq = baseFreq * Math.pow(2, item.semitones / 12);
        this.playTone(baseFreq, 1.2);
        this.playTone(targetFreq, 1.2);
      } else {
        const targetFreq = baseFreq * Math.pow(2, item.semitones / 12);
        this.playTone(baseFreq, 0.6);
        setTimeout(() => this.playTone(targetFreq, 0.6), 700);
      }
    }
  }

  selectIntervalAnswer(answer: string): void {
    if (!this.exercise?.content || this.answerFeedback.show) return;
    if (this.currentIntervalIndex >= this._intervalSequence.length) return;

    const content = this.exercise.content;
    const item = this._intervalSequence[this.currentIntervalIndex];
    let isCorrect = false;
    let correctAnswer = '';

    if (content.type === 'chord_quality') {
      isCorrect = item.answer === answer;
      correctAnswer = this.chordQualityLabels[item.answer] || item.answer;
    } else {
      isCorrect = item.name === answer || item.shortName === answer;
      correctAnswer = item.name;
    }

    const givenAnswer = content.type === 'chord_quality'
      ? (this.chordQualityLabels[answer] || answer)
      : answer;

    this.intervalAnswers.push({ correct: isCorrect });

    const advance = () => {
      if (this.intervalAnswers.length >= this._intervalSequence.length) {
        const score = Math.round(
          (this.intervalAnswers.filter(a => a.correct).length / this.intervalAnswers.length) * 100
        );
        this.submitResult(score, score);
      } else {
        this.currentIntervalIndex++;
      }
    };

    this.showFeedbackAndAdvance(isCorrect, correctAnswer, givenAnswer, advance);
  }

  private playTone(frequency: number, duration: number): void {
    if (!this.audioContext) return;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
    osc.start(this.audioContext.currentTime);
    osc.stop(this.audioContext.currentTime + duration);
  }

  private playChord(notes: string[]): void {
    for (const note of notes) {
      const freq = this.noteToFreq(note);
      this.playTone(freq, 1.2);
    }
  }

  private playArpeggioThenChord(notes: string[]): void {
    const delay = 300;
    notes.forEach((note, i) => {
      setTimeout(() => {
        this.playTone(this.noteToFreq(note), 0.5);
      }, i * delay);
    });
    const chordStart = notes.length * delay + 400;
    setTimeout(() => {
      this.playChord(notes);
    }, chordStart);
  }

  private playClick(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    this.playTone(800, 0.05);
  }

  private showFeedbackAndAdvance(isCorrect: boolean, correctAnswer: string, givenAnswer: string, advanceFn: () => void): void {
    this.answerFeedback = { show: true, isCorrect, correctAnswer, givenAnswer };
    const delay = isCorrect ? 1000 : 2500;
    setTimeout(() => {
      this.answerFeedback = { show: false, isCorrect: false, correctAnswer: '', givenAnswer: '' };
      advanceFn();
    }, delay);
  }

  private playMetronomeClick(accent: boolean): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    this.playTone(accent ? 1200 : 800, 0.05);
  }

  private noteToFreq(note: string): number {
    const notes: Record<string, number> = {
      'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11, 'H': 11
    };
    const match = note.match(/^([A-H])(b|#)?(\d)$/);
    if (!match) return 440;
    let semitone = notes[match[1]] || 0;
    if (match[2] === '#') semitone++;
    if (match[2] === 'b') semitone--;
    const octave = parseInt(match[3]);
    return 440 * Math.pow(2, ((octave - 4) * 12 + semitone - 9) / 12);
  }

  // === SUBMIT ===
  private submitResult(score: number, accuracy: number): void {
    if (!this.exercise || this.isSubmitting) return;

    this.isSubmitting = true;
    this.exerciseDuration = Math.round((Date.now() - this.exerciseStartTime) / 1000);

    this.trainingService.submitAttempt(this.exercise.id, {
      score,
      accuracy,
      duration: this.exerciseDuration,
      details: {
        tapTimes: this.tapTimes.length > 0 ? this.tapTimes : undefined,
        selectedOption: this.selectedOption,
        noteAnswers: this.noteAnswers.length > 0 ? this.noteAnswers : undefined,
        intervalAnswers: this.intervalAnswers.length > 0 ? this.intervalAnswers : undefined
      }
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.result = result;
        this.phase = 'result';
        this.isSubmitting = false;
      },
      error: () => {
        this.phase = 'result';
        this.result = {
          xpEarned: 0,
          totalXp: 0,
          currentLevel: 0,
          leveledUp: false,
          currentStreak: 0,
          longestStreak: 0,
          attempt: { score, accuracy, duration: this.exerciseDuration } as any
        };
        this.isSubmitting = false;
      }
    });
  }

  restartExercise(): void {
    this.phase = 'ready';
    this.result = null;
    this.tapTimes = [];
    this.selectedOption = null;
    this.isCorrect = null;
    this.recognitionAnswered = false;
    this.recognitionRoundIndex = 0;
    this.recognitionAnswers = [];
    this.currentRound = null;
    this.currentNoteIndex = 0;
    this.noteAnswers = [];
    this.currentIntervalIndex = 0;
    this.intervalAnswers = [];
    this.scaleAnswers = [];
    this.currentScaleIndex = 0;
    this.keySignatureAnswers = [];
    this.currentKeyIndex = 0;
    this.currentKeySignature = null;
    this.intervalReadingAnswers = [];
    this.currentIntervalReadingIndex = 0;
    this.currentIntervalPair = null;
    this.answerFeedback = { show: false, isCorrect: false, correctAnswer: '', givenAnswer: '' };
    this.prepareExercise();
  }

  goToList(): void {
    this.router.navigate(['/training/exercises'], {
      queryParams: this.exercise ? { module: this.exercise.module } : {}
    });
  }

  navigateBack(): void {
    if (this.phase === 'playing') {
      if (!confirm('Übung wirklich abbrechen? Der Fortschritt geht verloren.')) {
        return;
      }
      this.stopMetronome();
    }
    this.router.navigate(['/training']);
  }

  // Template helpers
  get intervalOptions(): string[] {
    if (!this.exercise?.content) return [];
    if (this.exercise.content.type === 'chord_quality') {
      const answers = new Set<string>((this.exercise.content.chords || []).map((c: any) => c.answer));
      return Array.from(answers);
    }
    return (this.exercise.content.intervals || []).map((i: any) => i.name);
  }

  get chordQualityLabels(): Record<string, string> {
    return {
      dur: 'Dur', moll: 'Moll',
      vermindert: 'Vermindert', uebermässig: 'Übermäßig',
      dom7: 'Dominant-7', moll7: 'Moll-7', maj7: 'Maj-7', hdim7: 'Halbverm.',
      grundstellung: 'Grundstellung',
      '1. Umkehrung': '1. Umkehrung',
      '2. Umkehrung': '2. Umkehrung',
      '3. Umkehrung': '3. Umkehrung'
    };
  }

  // === SCALE HEARING ===
  private _scaleSequence: any[] = [];

  private prepareScaleSequence(): void {
    if (!this.exercise?.content?.scales) return;
    const scales = this.exercise.content.scales;
    const count = this.exercise.content.count || 8;
    this._scaleSequence = [];
    const baseNotes = this.exercise.content.baseNotes || ['C4'];
    for (let i = 0; i < count; i++) {
      const scale = scales[Math.floor(Math.random() * scales.length)];
      const baseNote = baseNotes[Math.floor(Math.random() * baseNotes.length)];
      this._scaleSequence.push({ ...scale, baseNote });
    }
    this.currentScaleIndex = 0;
    this.scaleAnswers = [];
  }

  playScale(): void {
    if (!this.audioContext || this.isPlayingScale) return;
    if (this.currentScaleIndex >= this._scaleSequence.length) return;

    const item = this._scaleSequence[this.currentScaleIndex];
    const baseFreq = this.noteToFreq(item.baseNote);
    this.isPlayingScale = true;

    const intervals = item.intervals;
    const noteDelay = 400; // ms between scale notes

    for (let i = 0; i < intervals.length; i++) {
      const freq = baseFreq * Math.pow(2, intervals[i] / 12);
      setTimeout(() => this.playTone(freq, 0.4), i * noteDelay);
    }
    setTimeout(() => this.isPlayingScale = false, intervals.length * noteDelay + 200);
  }

  selectScaleAnswer(answer: string): void {
    if (!this.exercise?.content || this.answerFeedback.show) return;
    if (this.currentScaleIndex >= this._scaleSequence.length) return;

    const item = this._scaleSequence[this.currentScaleIndex];
    const isCorrect = item.name === answer;
    this.scaleAnswers.push({ correct: isCorrect });

    const advance = () => {
      if (this.scaleAnswers.length >= this._scaleSequence.length) {
        const score = Math.round(
          (this.scaleAnswers.filter(a => a.correct).length / this.scaleAnswers.length) * 100
        );
        this.submitResult(score, score);
      } else {
        this.currentScaleIndex++;
      }
    };

    this.showFeedbackAndAdvance(isCorrect, item.name, answer, advance);
  }

  get scaleOptions(): string[] {
    if (!this.exercise?.content?.scales) return [];
    return this.exercise.content.scales.map((s: any) => s.name);
  }

  get scaleProgress(): string {
    return `${this.scaleAnswers.length + 1} / ${this._scaleSequence.length}`;
  }

  // === KEY SIGNATURE ===
  private _keySequence: any[] = [];

  // Sharp positions on treble clef (line positions from bottom, 0 = bottom line E4)
  readonly sharpPositions = [8, 5, 9, 6, 3, 7, 4]; // F C G D A E B
  readonly flatPositions = [4, 7, 3, 6, 2, 5, 1]; // B E A D G C F

  private prepareKeySignatureSequence(): void {
    if (!this.exercise?.content?.keySignatures) return;
    const keys = this.exercise.content.keySignatures;
    const count = this.exercise.content.count || 8;
    this._keySequence = [];
    for (let i = 0; i < count; i++) {
      this._keySequence.push(keys[Math.floor(Math.random() * keys.length)]);
    }
    this.currentKeyIndex = 0;
    this.currentKeySignature = this._keySequence[0];
    this.keySignatureAnswers = [];
  }

  selectKeyAnswer(answer: string): void {
    if (!this.exercise?.content || this.answerFeedback.show) return;
    if (this.currentKeyIndex >= this._keySequence.length) return;

    const item = this._keySequence[this.currentKeyIndex];
    const isCorrect = item.answer === answer;
    this.keySignatureAnswers.push({ correct: isCorrect });

    const advance = () => {
      if (this.keySignatureAnswers.length >= this._keySequence.length) {
        const score = Math.round(
          (this.keySignatureAnswers.filter(a => a.correct).length / this.keySignatureAnswers.length) * 100
        );
        this.submitResult(score, score);
      } else {
        this.currentKeyIndex++;
        this.currentKeySignature = this._keySequence[this.currentKeyIndex];
      }
    };

    this.showFeedbackAndAdvance(isCorrect, item.answer, answer, advance);
  }

  get keyOptions(): string[] {
    if (!this.exercise?.content?.keySignatures) return [];
    return this.exercise.content.keySignatures.map((k: any) => k.answer);
  }

  get keyProgress(): string {
    return `${this.keySignatureAnswers.length + 1} / ${this._keySequence.length}`;
  }

  get currentSharps(): number[] {
    if (!this.currentKeySignature) return [];
    return this.sharpPositions.slice(0, this.currentKeySignature.sharps);
  }

  get currentFlats(): number[] {
    if (!this.currentKeySignature) return [];
    return this.flatPositions.slice(0, this.currentKeySignature.flats);
  }

  // === INTERVAL READING ===
  private _intervalReadingSequence: any[] = [];

  private prepareIntervalReadingSequence(): void {
    if (!this.exercise?.content?.intervals) return;
    const intervals = this.exercise.content.intervals;
    const count = this.exercise.content.count || intervals.length;
    this._intervalReadingSequence = [];
    for (let i = 0; i < count; i++) {
      this._intervalReadingSequence.push(intervals[Math.floor(Math.random() * intervals.length)]);
    }
    this.currentIntervalReadingIndex = 0;
    this.currentIntervalPair = this._intervalReadingSequence[0];
    this.intervalReadingAnswers = [];
  }

  selectIntervalReadingAnswer(answer: string): void {
    if (!this.exercise?.content || this.answerFeedback.show) return;
    if (this.currentIntervalReadingIndex >= this._intervalReadingSequence.length) return;

    const item = this._intervalReadingSequence[this.currentIntervalReadingIndex];
    const isCorrect = item.answer === answer;
    this.intervalReadingAnswers.push({ correct: isCorrect });

    const advance = () => {
      if (this.intervalReadingAnswers.length >= this._intervalReadingSequence.length) {
        const score = Math.round(
          (this.intervalReadingAnswers.filter(a => a.correct).length / this.intervalReadingAnswers.length) * 100
        );
        this.submitResult(score, score);
      } else {
        this.currentIntervalReadingIndex++;
        this.currentIntervalPair = this._intervalReadingSequence[this.currentIntervalReadingIndex];
      }
    };

    this.showFeedbackAndAdvance(isCorrect, item.answer, answer, advance);
  }

  get intervalReadingOptions(): string[] {
    if (!this.exercise?.content?.options) return [];
    return this.exercise.content.options;
  }

  get intervalReadingProgress(): string {
    return `${this.intervalReadingAnswers.length + 1} / ${this._intervalReadingSequence.length}`;
  }

  get note1Y(): number {
    if (!this.currentIntervalPair) return 40;
    return this.staffPositionY(this.getStaffPosition(this.currentIntervalPair.note1, this.intervalReadingClef));
  }

  get note2Y(): number {
    if (!this.currentIntervalPair) return 30;
    return this.staffPositionY(this.getStaffPosition(this.currentIntervalPair.note2, this.intervalReadingClef));
  }

  get note1LedgerLines(): number[] {
    if (!this.currentIntervalPair) return [];
    return this.getLedgerLines(this.getStaffPosition(this.currentIntervalPair.note1, this.intervalReadingClef));
  }

  get note2LedgerLines(): number[] {
    if (!this.currentIntervalPair) return [];
    return this.getLedgerLines(this.getStaffPosition(this.currentIntervalPair.note2, this.intervalReadingClef));
  }

  get intervalReadingClef(): string {
    if (this.currentIntervalPair?.clef) return this.currentIntervalPair.clef;
    return this.exercise?.content?.clef || 'treble';
  }

  // Rhythm notation display
  get rhythmBars(): { notes: { symbol: string; isRest: boolean; width: number }[] }[] {
    if (!this.exercise?.content?.pattern) return [];
    const pattern = this.exercise.content.pattern;
    const beatsPerBar = 4; // 4/4 time
    const bars: { notes: { symbol: string; isRest: boolean; width: number }[] }[] = [];
    let currentBar: { symbol: string; isRest: boolean; width: number }[] = [];
    let barBeatCount = 0;

    for (const note of pattern) {
      const beats = this.getNoteDurationBeats(note.type);
      const isRest = note.type.startsWith('rest') || note.type.startsWith('rest_');
      const symbol = this.noteTypeToSymbol(note.type);

      if (barBeatCount >= beatsPerBar) {
        bars.push({ notes: currentBar });
        currentBar = [];
        barBeatCount = 0;
      }

      currentBar.push({ symbol, isRest, width: beats });
      barBeatCount += beats;
    }
    if (currentBar.length > 0) {
      bars.push({ notes: currentBar });
    }
    return bars;
  }

  private noteTypeToSymbol(type: string): string {
    switch (type) {
      case 'whole': return '𝅝';
      case 'rest_whole': return '𝄻';
      case 'half': return '𝅗𝅥';
      case 'rest_half': return '𝄼';
      case 'dotted_half': return '𝅗𝅥.';
      case 'quarter': return '♩';
      case 'rest_quarter': return '𝄾';
      case 'dotted_quarter': return '♩.';
      case 'eighth': return '♪';
      case 'rest_eighth': return '𝄾♪';
      case 'dotted_eighth': return '♪.';
      case 'sixteenth': return '𝅘𝅥𝅯';
      case 'rest_sixteenth': return '𝄿';
      case 'triplet_eighth': return '³♪';
      default: return '♩';
    }
  }

  get currentProgress(): string {
    if (this.exercise?.type === 'name_note') {
      const total = this.exercise.content.count || this.exercise.content.notes.length;
      return `${this.noteAnswers.length + 1} / ${total}`;
    }
    if (this.exercise?.type === 'interval_hearing') {
      const total = this._intervalSequence.length;
      return `${this.intervalAnswers.length + 1} / ${total}`;
    }
    return '';
  }

  // === STAFF RENDERING ===
  staffLineY(index: number): number {
    // index 0 = top line, index 4 = bottom line
    return this.STAFF_TOP_Y + index * this.LINE_SPACING;
  }

  staffPositionY(position: number): number {
    // position 0 = bottom line (E4 treble / G2 bass), position 8 = top line
    const bottomLineY = this.STAFF_TOP_Y + 4 * this.LINE_SPACING;
    return bottomLineY - position * this.STEP;
  }

  getStaffPosition(pitch: string, clefOverride?: string): number {
    if (!this.exercise) return 0;
    const clef = clefOverride || this.exercise.content.clef;
    const match = pitch.match(/^([A-HCDEFGa-h])(#|b)?(\d)$/);
    if (!match) return 0;
    const noteOrder: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6, H: 6 };
    const noteIdx = noteOrder[match[1].toUpperCase()] ?? 0;
    const octave = parseInt(match[3]);
    const absolute = octave * 7 + noteIdx;
    // Treble: bottom line = E4, absolute = 4*7+2 = 30
    // Bass: bottom line = G2, absolute = 2*7+4 = 18
    const reference = clef === 'bass' ? 18 : 30;
    return absolute - reference;
  }

  getLedgerLines(position: number): number[] {
    const lines: number[] = [];
    if (position <= -2) {
      for (let p = -2; p >= position; p -= 2) lines.push(p);
    }
    if (position >= 10) {
      for (let p = 10; p <= position; p += 2) lines.push(p);
    }
    return lines;
  }

  get noteY(): number {
    if (!this.currentNote) return 40;
    return this.staffPositionY(this.getStaffPosition(this.currentNote.pitch));
  }

  get currentLedgerLines(): number[] {
    if (!this.currentNote) return [];
    return this.getLedgerLines(this.getStaffPosition(this.currentNote.pitch));
  }

  get stemUp(): boolean {
    // Stem goes up when note is below middle line (position < 4)
    return this.noteY > this.staffPositionY(4);
  }
}
