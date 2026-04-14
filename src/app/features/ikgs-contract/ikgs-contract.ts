import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ApiOptionsModel } from '../../core/models/api.model';
import { GetContractModel } from '../../models/domain/GetContractModel';
import { EndPoints, Repository, RequestType } from '../../core/enums/api.enum';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-ikgs-contract',
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule, ToastModule, ConfirmDialogModule],
  templateUrl: './ikgs-contract.html',
  styleUrl: './ikgs-contract.scss',
})
export class IkgsContract implements OnInit {
  contracts: any[] = [];
  restService = inject(IkgsRest);
  private notification = inject(NotificationService);

  constructor() {}
  ngOnInit() {
    this.GetAllContractAsync();
  }

  GetAllContractAsync() {
    const opts = new ApiOptionsModel<GetContractModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllContractAsync;
    this.restService.CallApi<GetContractModel[], GetContractModel[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.contracts = res.Data;
    });
  }

  async removeMasterContractAsync(contract_Id: number): Promise<void> {
    const confirmed = await this.notification.confirm(
      'Remove Contract?',
      'This will permanently delete this contract and all its stage data.',
    );
    if (!confirmed) return;

    const opts = new ApiOptionsModel<GetContractModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.RemoveMasterContractAsync;
    opts.ReqQueryParams = [{ Key: 'contract_Id', Value: contract_Id.toString(), IsDate: false }];
    this.restService.CallApi<GetContractModel[], GetContractModel[]>(opts).subscribe({
      next: (res: any) => {
        if (res?.Code === 200 && res.Data === true) {
          const index = this.contracts.findIndex((x) => x.contract_Id === contract_Id);
          if (index !== -1) this.contracts.splice(index, 1);
          this.notification.success('Removed', 'Contract has been removed successfully.');
        }
      },
      error: () => this.notification.error('Error', 'Could not remove the contract. Please try again.'),
    });
  }

  getStatusSeverity(
    status: string,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Progress':
        return 'info';
      case 'Draft':
        return 'warn';
      default:
        return 'secondary';
    }
  }
}
