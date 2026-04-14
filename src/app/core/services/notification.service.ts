import { Injectable } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor(
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) {}

  success(title: string, message: string): void {
    this.messageService.add({ severity: 'success', summary: title, detail: message, life: 3000 });
  }

  error(title: string, message: string): void {
    this.messageService.add({ severity: 'error', summary: title, detail: message, life: 4000 });
  }

  warning(title: string, message: string): void {
    this.messageService.add({ severity: 'warn', summary: title, detail: message, life: 4000 });
  }

  confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationService.confirm({
        header: title,
        message,
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Yes, Delete',
        rejectLabel: 'Cancel',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-secondary p-button-outlined',
        accept: () => resolve(true),
        reject: () => resolve(false),
      });
    });
  }
}
