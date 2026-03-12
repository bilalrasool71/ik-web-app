import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-ikgs-contract',
  imports: [TableModule, RouterLink],
  templateUrl: './ikgs-contract.html',
  styleUrl: './ikgs-contract.scss',
})
export class IkgsContract {}
