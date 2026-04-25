import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IkgsRest } from '../../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../../core/enums/api.enum';
import { ApiOptionsModel } from '../../../core/models/api.model';
import { SelectionValueModel } from '../../../models/common/selection-value.model';
import { GetWoItemsDto } from '../../../models/domain/GetWoItem.model';
import {
  ContractsMasterDto,
  ContractsStagesDtlDto,
} from '../../../models/domain/ContractsMasterDto';

@Injectable({ providedIn: 'root' })
export class IkgsContractFormService {
  private restService = inject(IkgsRest);

  // ── LOV Calls ─────────────────────────────────────────────────

  getAllWoShortAsync(): Observable<any> {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllWoShortAsync;
    return this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts);
  }

  getOrderStagesShortAsync(): Observable<any> {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetOrderStagesShortAsync;
    return this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts);
  }

  getAllPartiesBystage_IdAsync(stage_Id: number): Observable<any> {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllPartiesByStageIdAsync;
    opts.ReqQueryParams = [{ Key: 'stage_Id', Value: stage_Id, IsDate: false }];
    return this.restService.CallApi(opts);
  }

  getAllUOMAsync(): Observable<any> {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Catalog;
    opts.EndPoint = EndPoints.GetAllUOMAsync;
    opts.ReqQueryParams = [];
    return this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts);
  }

  GetAllItemsByStageIdAsync(
    wo: number,
    stage_Id: number,
    isParent: boolean,
    param?: string[],
  ): Observable<any> {
    const opts = new ApiOptionsModel<GetWoItemsDto[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllItemsByStageIdAsync;
    opts.ReqQueryParams = [
      { Key: 'wo', Value: wo, IsDate: false },
      { Key: 'stage_Id', Value: stage_Id, IsDate: false },
      { Key: 'isParent', Value: isParent, IsDate: false },
      { Key: 'param', Value: param, IsDate: false },
    ];
    return this.restService.CallApi<GetWoItemsDto[], GetWoItemsDto[]>(opts);
  }

  // ── Load for Edit ─────────────────────────────────────────────

  loadContractForEdit(contractId: number): Observable<any> {
    const opts = new ApiOptionsModel<ContractsMasterDto>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetContractByIdAsync;
    opts.ReqQueryParams = [{ Key: 'contractId', Value: contractId, IsDate: false }];
    return this.restService.CallApi<ContractsMasterDto, ContractsMasterDto>(opts);
  }

  // ── Save ──────────────────────────────────────────────────────

  saveMaster(dto: ContractsMasterDto): Observable<any> {
    const opts = new ApiOptionsModel<ContractsMasterDto>();
    opts.RequestType = RequestType.POST;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.AddUpdateMasterContractAsync;
    opts.ParamObj = dto;
    return this.restService.CallApi<ContractsMasterDto, ContractsMasterDto>(opts);
  }

  saveStageRow(dto: ContractsStagesDtlDto): Promise<ContractsStagesDtlDto> {
    return new Promise((resolve, reject) => {
      const opts = new ApiOptionsModel<ContractsStagesDtlDto>();
      opts.RequestType = RequestType.POST;
      opts.Repository = Repository.Contract;
      opts.EndPoint = EndPoints.AddUpdateContractStageAsync;
      opts.ParamObj = dto;
      this.restService.CallApi<ContractsStagesDtlDto, ContractsStagesDtlDto>(opts).subscribe({
        next: (res: any) => {
          if (res?.Code === 200 && res.Data) resolve(res.Data);
          else reject(res);
        },
        error: (err: any) => reject(err),
      });
    });
  }

  // ── Delete ────────────────────────────────────────────────────

  removeStageRowApi(stageRowId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      const opts = new ApiOptionsModel<object>();
      opts.RequestType = RequestType.GET;
      opts.Repository = Repository.Contract;
      opts.EndPoint = EndPoints.RemoveStageRowAsync;
      opts.ReqQueryParams = [{ Key: 'stage_RowId', Value: stageRowId, IsDate: false }];

      this.restService.CallApi<object, object>(opts).subscribe({
        next: (res: any) => {
          const success = res === true || res?.Data === true || res?.Code === 200;
          success ? resolve(res) : reject(res); // ✅ return response
        },
        error: (err: any) => reject(err),
      });
    });
  }

  removeMaterialItemApi(materialRowId: number, matType: string = '', stageId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const opts = new ApiOptionsModel<object>();
      opts.RequestType = RequestType.GET;
      opts.Repository = Repository.Contract;
      opts.EndPoint = EndPoints.RemoveMaterialItemAsync;
      opts.ReqQueryParams = [
        { Key: 'material_RowId', Value: materialRowId, IsDate: false },
        { Key: 'mat_Type', Value: matType, IsDate: false },
        { Key: 'stageId', Value: stageId, IsDate: false },
      ];
      this.restService.CallApi<object, object>(opts).subscribe({
        next: (res: any) => {
          // Handle both wrapped { Code: 200, Data: true } and raw true
          const success = res === true || res?.Data === true || res?.Code === 200;
          success ? resolve() : reject(new Error('Delete returned false'));
        },
        error: (err: any) => reject(err),
      });
    });
  }
}
