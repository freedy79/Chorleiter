import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialModule } from '@modules/material.module';
import { Poll, PollOption } from '@core/models/poll';
import { Post } from '@core/models/post';
import { ApiService } from '@core/services/api.service';

@Component({
  selector: 'app-post-poll',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialModule],
  templateUrl: './post-poll.component.html',
  styleUrls: ['./post-poll.component.scss']
})
export class PostPollComponent implements OnChanges {
  @Input() post!: Post;
  @Output() pollChange = new EventEmitter<Poll | null>();
  selectedOptionIds: number[] = [];
  voting = false;

  constructor(private api: ApiService, private snackBar: MatSnackBar) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) {
      this.syncSelection();
    }
  }

  get poll(): Poll | null | undefined {
    return this.post?.poll;
  }

  get isClosed(): boolean {
    if (!this.poll?.closesAt) return false;
    return new Date(this.poll.closesAt) < new Date();
  }

  selectSingle(optionId: number): void {
    if (!this.poll || this.isClosed || this.voting) return;
    this.selectedOptionIds = [optionId];
  }

  toggleMulti(optionId: number, checked: boolean): void {
    if (!this.poll || this.isClosed || this.voting) return;
    if (checked) {
      if (this.selectedOptionIds.length >= this.poll.maxSelections) {
        this.snackBar.open(`Maximal ${this.poll.maxSelections} Optionen auswählbar.`, 'Schließen', { duration: 3000 });
        return;
      }
      this.selectedOptionIds = [...this.selectedOptionIds, optionId];
    } else {
      this.selectedOptionIds = this.selectedOptionIds.filter(id => id !== optionId);
    }
  }

  submitVote(): void {
    if (!this.post?.id || !this.poll || this.isClosed) return;
    if (this.selectedOptionIds.length === 0) {
      this.snackBar.open('Bitte mindestens eine Option auswählen.', 'Schließen', { duration: 3000 });
      return;
    }
    this.voting = true;
    this.api.voteOnPost(this.post.id, this.selectedOptionIds).subscribe({
      next: poll => {
        this.post.poll = poll;
        this.pollChange.emit(poll);
        this.syncSelection();
        this.snackBar.open('Stimme gespeichert.', 'OK', { duration: 3000 });
        this.voting = false;
      },
      error: () => {
        this.snackBar.open('Abstimmung nicht möglich.', 'Schließen', { duration: 4000 });
        this.voting = false;
      }
    });
  }

  getPercentage(option: PollOption): number {
    if (!this.poll || !this.poll.totalVotes) return 0;
    return Math.round((option.votes / this.poll.totalVotes) * 100);
  }

  private syncSelection(): void {
    if (!this.poll) {
      this.selectedOptionIds = [];
      return;
    }
    this.selectedOptionIds = this.poll.options.filter(o => o.selected).map(o => o.id);
  }
}
