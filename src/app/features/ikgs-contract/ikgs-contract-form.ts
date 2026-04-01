import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { Router } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel } from '../../core/models/api.model';
import { __addDisposableResource } from 'tslib';

@Component({
  selector: 'app-ikgs-contract-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    MultiSelectModule,
    ButtonModule,
  ],
  templateUrl: './ikgs-contract-form.html',
  styleUrl: './ikgs-contract-form.scss',
})
export class IkgsContractForm implements OnInit {
  restService = inject(IkgsRest);
  http = inject(HttpClient);
  router = inject(Router);
  fb = inject(FormBuilder);

  contractForm!: FormGroup;
  step = signal(0);
  previousSelectedStages: string[] = [];

  allContarctStages: WritableSignal<SelectionValueModel[]> = signal([]);
  allWos: WritableSignal<SelectionValueModel[]> = signal([]);

  ngOnInit(): void {
    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: [[]],
    });
    this.getAllWoShortAsync();
    this.getOrderStagesShortAsync();
  }

  // ==========================================
  // STAGE SELECTION & STEPPER
  // ==========================================

  onStageChange(selectedStages: string[]) {
    this.previousSelectedStages = [...selectedStages];
    const active = this.getActiveStepLabels();
    if (active.length > 0 && !active.some(s => s.index === this.step())) {
      this.step.set(active[0].index);
    }
  }

  getActiveStepLabels(): { index: number; label: string }[] {
    const selected: string[] = this.contractForm?.get('Stages')?.value || [];
    return this.allContarctStages()
      .filter(s => selected.includes(s.value.toString()))
      .map(s => ({ index: Number(s.value), label: s.viewValue }))
      .sort((a, b) => a.index - b.index);
  }

  isFirstActiveStep(): boolean {
    const active = this.getActiveStepLabels();
    return active.length === 0 || active[0].index === this.step();
  }

  isLastActiveStep(): boolean {
    const active = this.getActiveStepLabels();
    return active.length === 0 || active[active.length - 1].index === this.step();
  }

  stepPlus() {
    const active = this.getActiveStepLabels();
    const idx = active.findIndex(s => s.index === this.step());
    if (idx !== -1 && idx < active.length - 1) this.step.set(active[idx + 1].index);
  }

  stepMinus() {
    const active = this.getActiveStepLabels();
    const idx = active.findIndex(s => s.index === this.step());
    if (idx > 0) this.step.set(active[idx - 1].index);
  }

  getCurrentStageLabel(): string {
    return this.getActiveStepLabels().find(s => s.index === this.step())?.label ?? '';
  }

  // ==========================================
  // LOAD CONTRACT DATA
  // ==========================================


  // ==========================================
  // API
  // ==========================================

  getAllWoShortAsync() {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllWoShortAsync;
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allWos.set(res.Data);
    });
  }

  getOrderStagesShortAsync() {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetOrderStagesShortAsync;
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allContarctStages.set(res.Data);
    });
  }

  getAllPartiesByStageIdAsync(stage_Id: number) {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllPartiesByStageIdAsync;
    opts.ReqQueryParams = [
      {
        Key: 'stageId',
        Value: stage_Id,
        IsDate: false
      }
    ]
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allContarctStages.set(res.Data);
    });
  }


  // ==========================================
  // MISC
  // ==========================================

  onSubmit() {
    console.log(this.contractForm.value);
  }

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value)
  }
}