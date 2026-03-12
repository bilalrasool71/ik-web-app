import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from "primeng/table";
import { TagModule } from "primeng/tag";

@Component({
  selector: 'app-ikgs-contract',
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
  templateUrl: './ikgs-contract.html',
  styleUrl: './ikgs-contract.scss',
})
export class IkgsContract {

   contracts = [
        { id: 1, customer: 'Nike', styleType: 'Garment', season: 'Spring 2026', gender: 'Men', productType: 'T-Shirt', status: 'Draft' },
        { id: 2, customer: 'Adidas', styleType: 'Garment', season: 'Fall 2026', gender: 'Women', productType: 'Polo Shirt', status: 'Completed' },
        { id: 3, customer: 'Puma', styleType: 'Fabric', season: 'Summer 2026', gender: 'Kids', productType: 'Shorts', status: 'In Progress' },
    ];

    getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'info';
            case 'Draft': return 'warn';
            default: return 'secondary';
        }
    }
}
