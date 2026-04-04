import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ApiOptionsModel } from '../../core/models/api.model';
import { GetContractModel } from '../../models/domain/GetContractModel';
import { EndPoints, Repository, RequestType } from '../../core/enums/api.enum';
import { IkgsRest } from '../../core/services/ikgs-rest';

@Component({
  selector: 'app-ikgs-contract',
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
  templateUrl: './ikgs-contract.html',
  styleUrl: './ikgs-contract.scss',
})
export class IkgsContract implements OnInit {
  contracts: any[] = [];
  restService = inject(IkgsRest);

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

  removeMasterContractAsync(contract_Id: number) {
    const opts = new ApiOptionsModel<GetContractModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.RemoveMasterContractAsync;
    opts.ReqQueryParams = [{ Key: 'contract_Id', Value: contract_Id.toString(), IsDate: false }];
    this.restService.CallApi<GetContractModel[], GetContractModel[]>(opts).subscribe((res: any) => {
      if (res.Data.data == true) {        
        if (this.contracts.length > 1) {
          const index = this.contracts.findIndex((x) => x.contractid === contract_Id);
          if (index !== -1) {
            this.contracts.splice(index, 1);
          }
        }
      }
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
