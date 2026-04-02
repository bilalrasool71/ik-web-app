import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel } from '../../core/models/api.model';

@Component({
  selector: 'app-ikgs-contract-form',
  imports: [
    CommonModule, ReactiveFormsModule,
    SelectModule, MultiSelectModule, ButtonModule,
    InputTextModule, InputNumberModule,
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

  // LOV Signals
  allContarctStages: WritableSignal<SelectionValueModel[]> = signal([]);
  allWos: WritableSignal<SelectionValueModel[]> = signal([]);
  allParties: WritableSignal<SelectionValueModel[]> = signal([]);
  allMaterials: WritableSignal<SelectionValueModel[]> = signal([]);
  allColors: WritableSignal<SelectionValueModel[]> = signal([]);
  allSizes: WritableSignal<SelectionValueModel[]> = signal([]);
  allUoms: WritableSignal<SelectionValueModel[]> = signal([]);

  ngOnInit(): void {
    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: [[]],
      // Stage 0: Yarn — single entry
      yarnStage: this.createYarnEntry(),
      // Stage 1: Knitting — multiple entries
      knittingStage: this.fb.array([this.createKnittingEntry()]),
      // Stage 2: Dyeing — multiple entries
      dyeingStage: this.fb.array([this.createDyeingEntry()]),
      // Stage 3+: Cutting onwards — multiple entries
      cuttingStage: this.fb.array([this.createCuttingEntry()]),
    });

    this.getAllWoShortAsync();
    this.getOrderStagesShortAsync();
  }

  // ── Stepper ────────────────────────────────────────────────
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

  // ── Shared factory ─────────────────────────────────────────
  createMaterialItem(): FormGroup {
    return this.fb.group({ material_Id: [null], qty: [null] });
  }

  createColorItemGroup(): FormGroup {
    return this.fb.group({
      color_Id: [null],
      items: this.fb.array([this.createMaterialItem()])
    });
  }

  createSizeItemGroup(): FormGroup {
    return this.fb.group({
      size_Id: [null],
      items: this.fb.array([this.createMaterialItem()])
    });
  }

  createColorSizeGroup(): FormGroup {
    return this.fb.group({
      color_Id: [null],
      sizes: this.fb.array([this.createSizeItemGroup()])
    });
  }

  createStageHeader(): object {
    return { party_Id: [null], qty: [null], uom_Id: [null], fromDate: [null], toDate: [null] };
  }

  // ── Stage 0: Yarn ──────────────────────────────────────────
  createYarnEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      yarnItems: this.fb.array([this.createMaterialItem()])
    });
  }

  get yarnStage(): FormGroup { return this.contractForm.get('yarnStage') as FormGroup; }
  get yarnItems(): FormArray { return this.yarnStage.get('yarnItems') as FormArray; }
  addYarnItem() { this.yarnItems.push(this.createMaterialItem()); }
  removeYarnItem(i: number) { if (this.yarnItems.length > 1) this.yarnItems.removeAt(i); }

  // ── Stage 1: Knitting ──────────────────────────────────────
  createKnittingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      required: this.fb.array([this.createMaterialItem()]),
      input: this.fb.array([this.createMaterialItem()])
    });
  }

  get knittingStage(): FormArray { return this.contractForm.get('knittingStage') as FormArray; }
  addKnittingRow() { this.knittingStage.push(this.createKnittingEntry()); }
  removeKnittingRow(i: number) { if (this.knittingStage.length > 1) this.knittingStage.removeAt(i); }
  getKnittingRequired(ri: number): FormArray { return this.knittingStage.at(ri).get('required') as FormArray; }
  getKnittingInput(ri: number): FormArray { return this.knittingStage.at(ri).get('input') as FormArray; }
  addKnittingRequired(ri: number) { this.getKnittingRequired(ri).push(this.createMaterialItem()); }
  removeKnittingRequired(ri: number, ii: number) { if (this.getKnittingRequired(ri).length > 1) this.getKnittingRequired(ri).removeAt(ii); }
  addKnittingInput(ri: number) { this.getKnittingInput(ri).push(this.createMaterialItem()); }
  removeKnittingInput(ri: number, ii: number) { if (this.getKnittingInput(ri).length > 1) this.getKnittingInput(ri).removeAt(ii); }

  // ── Stage 2: Dyeing ────────────────────────────────────────
  createDyeingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      required: this.fb.array([this.createColorItemGroup()]),
      input: this.fb.array([this.createMaterialItem()])
    });
  }

  get dyeingStage(): FormArray { return this.contractForm.get('dyeingStage') as FormArray; }
  addDyeingRow() { this.dyeingStage.push(this.createDyeingEntry()); }
  removeDyeingRow(i: number) { if (this.dyeingStage.length > 1) this.dyeingStage.removeAt(i); }
  getDyeingRequired(ri: number): FormArray { return this.dyeingStage.at(ri).get('required') as FormArray; }
  getDyeingColorItems(ri: number, ci: number): FormArray { return this.getDyeingRequired(ri).at(ci).get('items') as FormArray; }
  getDyeingInput(ri: number): FormArray { return this.dyeingStage.at(ri).get('input') as FormArray; }
  addDyeingColorGroup(ri: number) { this.getDyeingRequired(ri).push(this.createColorItemGroup()); }
  removeDyeingColorGroup(ri: number, ci: number) { if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci); }
  addDyeingColorItem(ri: number, ci: number) { this.getDyeingColorItems(ri, ci).push(this.createMaterialItem()); }
  removeDyeingColorItem(ri: number, ci: number, ii: number) { if (this.getDyeingColorItems(ri, ci).length > 1) this.getDyeingColorItems(ri, ci).removeAt(ii); }
  addDyeingInput(ri: number) { this.getDyeingInput(ri).push(this.createMaterialItem()); }
  removeDyeingInput(ri: number, ii: number) { if (this.getDyeingInput(ri).length > 1) this.getDyeingInput(ri).removeAt(ii); }

  // ── Stage 3+: Cutting ──────────────────────────────────────
  createCuttingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      required: this.fb.array([this.createColorSizeGroup()]),
      input: this.fb.array([this.createColorItemGroup()])
    });
  }

  get cuttingStage(): FormArray { return this.contractForm.get('cuttingStage') as FormArray; }
  addCuttingRow() { this.cuttingStage.push(this.createCuttingEntry()); }
  removeCuttingRow(i: number) { if (this.cuttingStage.length > 1) this.cuttingStage.removeAt(i); }
  getCuttingRequired(ri: number): FormArray { return this.cuttingStage.at(ri).get('required') as FormArray; }
  getCuttingRequiredSizes(ri: number, ci: number): FormArray { return this.getCuttingRequired(ri).at(ci).get('sizes') as FormArray; }
  getCuttingRequiredSizeItems(ri: number, ci: number, si: number): FormArray { return this.getCuttingRequiredSizes(ri, ci).at(si).get('items') as FormArray; }
  getCuttingInput(ri: number): FormArray { return this.cuttingStage.at(ri).get('input') as FormArray; }
  getCuttingInputItems(ri: number, ci: number): FormArray { return this.getCuttingInput(ri).at(ci).get('items') as FormArray; }
  addCuttingColorGroup(ri: number) { this.getCuttingRequired(ri).push(this.createColorSizeGroup()); }
  removeCuttingColorGroup(ri: number, ci: number) { if (this.getCuttingRequired(ri).length > 1) this.getCuttingRequired(ri).removeAt(ci); }
  addCuttingSize(ri: number, ci: number) { this.getCuttingRequiredSizes(ri, ci).push(this.createSizeItemGroup()); }
  removeCuttingSize(ri: number, ci: number, si: number) { if (this.getCuttingRequiredSizes(ri, ci).length > 1) this.getCuttingRequiredSizes(ri, ci).removeAt(si); }
  addCuttingSizeItem(ri: number, ci: number, si: number) { this.getCuttingRequiredSizeItems(ri, ci, si).push(this.createMaterialItem()); }
  removeCuttingSizeItem(ri: number, ci: number, si: number, ii: number) { if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1) this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii); }
  addCuttingInputColor(ri: number) { this.getCuttingInput(ri).push(this.createColorItemGroup()); }
  removeCuttingInputColor(ri: number, ci: number) { if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci); }
  addCuttingInputItem(ri: number, ci: number) { this.getCuttingInputItems(ri, ci).push(this.createMaterialItem()); }
  removeCuttingInputItem(ri: number, ci: number, ii: number) { if (this.getCuttingInputItems(ri, ci).length > 1) this.getCuttingInputItems(ri, ci).removeAt(ii); }

  // ── API ────────────────────────────────────────────────────
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
    opts.ReqQueryParams = [{ Key: 'stageId', Value: stage_Id, IsDate: false }];
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allParties.set(res.Data);
    });
  }

  // ── Misc ───────────────────────────────────────────────────
  onSubmit() {
    console.log(this.contractForm.value);
  }

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value);
  }
}