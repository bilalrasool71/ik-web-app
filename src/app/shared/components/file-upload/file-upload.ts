import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { FileUploadType } from '../../../core/enums/file-upload-type.enum';

export interface UploadedFile {
    id?: string | number;
    name: string;
    url: string;
    size?: number;
    type?: string;
}

@Component({
    selector: 'app-file-upload',
    standalone: true,
    imports: [CommonModule, ButtonModule, ToastModule, DialogModule],
    templateUrl: './file-upload.html',
    styleUrl: './file-upload.scss',
    providers: [MessageService]
})
export class FileUploadComponent {
    messageService = inject(MessageService);

    @ViewChild('fileInputForm') fileInputForm!: ElementRef<HTMLInputElement>;

    @Input() uploadType: FileUploadType = FileUploadType.Single;
    @Input() allowedFileTypes: string = '*'; // e.g., 'image/*,application/pdf'
    @Input() maxFileSize: number = 20000000; // 20MB by default
    @Input() existingFiles: UploadedFile[] = [];

    @Output() onFilesSelected = new EventEmitter<File[]>();
    @Output() onUploadCustom = new EventEmitter<File[]>();
    @Output() onExistingFileRemoved = new EventEmitter<UploadedFile>();

    dialogVisible: boolean = false;
    previewVisible: boolean = false;
    previewUrl: string = '';
    isDragging: boolean = false;
    errorMessage: string | null = null;

    // Helper getters
    get isMultiple(): boolean {
        return this.uploadType === FileUploadType.Multiple || this.uploadType === FileUploadType.TypeSpecific;
    }

    get acceptTypes(): string {
        return this.uploadType === FileUploadType.TypeSpecific ? this.allowedFileTypes : '*';
    }

    // Internal state
    selectedFiles: File[] = [];

    openDialog() {
        this.errorMessage = null;
        this.dialogVisible = true;
    }

    getTotalFilesCount(): number {
        return this.existingFiles.length + this.selectedFiles.length;
    }

    // Drag and Drop Handlers
    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFiles(Array.from(files));
        }
    }

    triggerFileInput() {
        this.fileInputForm.nativeElement.click();
    }

    onFileSelected(event: any) {
        const files: FileList = event.target.files;
        if (files && files.length > 0) {
            this.handleFiles(Array.from(files));
        }
        // Reset the input value so the same file can be selected again if needed
        this.fileInputForm.nativeElement.value = '';
    }

    handleFiles(newFiles: File[]) {
        this.errorMessage = null;

        // Validate max file size
        const validFiles: File[] = [];
        const invalidFiles: File[] = [];

        newFiles.forEach(file => {
            if (file.size > this.maxFileSize) {
                invalidFiles.push(file);
            } else {
                validFiles.push(file);
            }
        });

        if (invalidFiles.length > 0) {
            const names = invalidFiles.map(f => f.name).join(', ');
            this.errorMessage = `Cannot upload: ${names}. Maximum allowed file size is ${this.formatSize(this.maxFileSize)}.`;
        }

        if (validFiles.length === 0) return;

        if (this.uploadType === FileUploadType.Single) {
            const nextFile = validFiles[validFiles.length - 1]; // Only take the last one
            this.selectedFiles = [nextFile];

            // If single upload and there is an existing file, notify removal of old one
            if (this.existingFiles.length > 0) {
                const oldFile = this.existingFiles[0];
                this.existingFiles = [];
                this.onExistingFileRemoved.emit(oldFile);
            }
        } else {
            // Check for duplicates
            const currentNames = this.selectedFiles.map(f => f.name);
            const actuallyNew = validFiles.filter(f => !currentNames.includes(f.name));
            this.selectedFiles = [...this.selectedFiles, ...actuallyNew];
        }

        this.onFilesSelected.emit(this.selectedFiles);
    }

    removeNewFile(index: number) {
        this.selectedFiles.splice(index, 1);
        this.onFilesSelected.emit(this.selectedFiles);
    }

    clearAllNewFiles() {
        this.selectedFiles = [];
        this.onFilesSelected.emit([]);
    }

    removeExistingFile(file: UploadedFile) {
        this.existingFiles = this.existingFiles.filter(f => f !== file);
        this.onExistingFileRemoved.emit(file);
    }

    viewFile(url: string) {
        if (this.isImageUrl(url)) {
            this.previewUrl = url;
            this.previewVisible = true;
        } else {
            window.open(url, '_blank');
        }
    }

    downloadFile(file: UploadedFile) {
        // Simple download anchor
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name || 'download';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    confirmUpload() {
        this.onUploadCustom.emit(this.selectedFiles);
        this.dialogVisible = false; // Close dialog on upload
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Files confirmed for upload.' });
    }

    isImage(file: File): boolean {
        return file.type.startsWith('image/');
    }

    isImageUrl(url: string): boolean {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) != null || url.startsWith('data:image');
    }

    createObjectURL(file: File): string {
        return URL.createObjectURL(file);
    }

    formatSize(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024, dm = 2, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}
