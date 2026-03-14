import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { MessageService } from 'primeng/api';
import { ApiOptionsModel, ApiResponseModel } from '../../core/models/api.model';
import { EndPoints, Repository, RequestType } from '../../core/enums/api.enum';
import { AllWorkOrderModel } from '../../models/domain/all-work-order.model';

@Component({
  selector: 'app-ikgs-work-order',
  standalone: true,
  imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
  templateUrl: './ikgs-work-order.html',
  styleUrl: './ikgs-work-order.scss',
})
export class IkgsWorkOrder implements OnInit {

  restService = inject(IkgsRest);
  messageService = inject(MessageService);
  loading = signal(false);
  router = inject(Router);



  getStatusSeverity(status: string): "success" | "info" | "warn" | "danger" | "secondary" | "contrast" | undefined {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'info';
      case 'Draft': return 'warn';
      default: return 'secondary';
    }
  }


  ngOnInit(): void {
    this.callOrderApis();
  }

  allWorkOrder: WritableSignal<AllWorkOrderModel[]> = signal([]);

  callOrderApis() {
    this.GetAllWorkOrder();
  }

  GetAllWorkOrder() {
    this.allWorkOrder.set([]);
    let authApiOpts = new ApiOptionsModel<AllWorkOrderModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Order;
    authApiOpts.EndPoint = EndPoints.GetAllWorkOrder;


    this.restService
      .CallApi<AllWorkOrderModel[], AllWorkOrderModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<AllWorkOrderModel[]>) => {

        //console.log("API WorkOrder List", result.Data);
        if (result?.Code === 200 && result.Data) {
          this.allWorkOrder.set(result.Data);
        }
      });
  }


  onEdit(woNo: number) {
    this.router.navigate(['/ikgs/work-order/edit', woNo])
  }


}
