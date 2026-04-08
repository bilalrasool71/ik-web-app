import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { GetWoItemsDto } from '../../models/domain/GetWoItem.model';
import {
  ContractsMasterDto,
  ContractsMaterialsDto,
  ContractsStagesDtlDto,
  ContractsStagesDto,
} from '../../models/domain/ContractsMasterDto';
import { IkgsContractFormService } from './ikgs-contract-form-helper/ikgs-contract-form.service';
import {
  createYarnEntry,
  createKnittingEntry,
  createKnittingRequiredItem,
  createDyeingEntry,
  createCuttingEntry,
  createMaterialItem,
  createColorItemGroup,
  createColorSizeGroup,
  createSizeItemGroup,
} from './ikgs-contract-form-helper/ikgs-contract-form.builders';

@Component({
  selector: 'app-ikgs-contract-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    MultiSelectModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
  ],
  templateUrl: './ikgs-contract-form.html',
  styleUrl: './ikgs-contract-form.scss',
})
export class IkgsContractForm implements OnInit {
  // ── Inputs ────────────────────────────────────────────────
  @Input() contractId: number | null = null;

  // ── Injections ────────────────────────────────────────────
  private contractFormService = inject(IkgsContractFormService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  // ── State ─────────────────────────────────────────────────
  contractForm!: FormGroup;
  step = signal(0);
  previousSelectedStages: string[] = [];
  stageSaveStatus = signal<Record<number, 'saving' | 'saved' | 'error'>>({});
  isEditMode = false;
  isLoadingContract = signal(false);

  // ── LOV Signals ───────────────────────────────────────────
  allContarctStages: WritableSignal<SelectionValueModel[]> = signal([]);
  allWos: WritableSignal<SelectionValueModel[]> = signal([]);
  allColors: WritableSignal<SelectionValueModel[]> = signal([]);
  allSizes: WritableSignal<SelectionValueModel[]> = signal([]);
  allUoms: WritableSignal<SelectionValueModel[]> = signal([]);
  allPartiesByStage = signal<Record<number, SelectionValueModel[]>>({});
  allMaterialsByStage = signal<Record<number, GetWoItemsDto[]>>({});
  allColorByStage = signal<Record<number, GetWoItemsDto[]>>({});
  allInputItemsByKnittingRow = signal<Record<number, GetWoItemsDto[]>>({});
  hoveredRequiredIndex = signal<Record<number, number>>({});

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['contractId'];
      if (id) this.contractId = +id;
    });

    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: [[]],
      yarnStage: createYarnEntry(this.fb),
      knittingStage: this.fb.array([createKnittingEntry(this.fb)]),
      dyeingStage: this.fb.array([createDyeingEntry(this.fb)]),
      cuttingStage: this.fb.array([createCuttingEntry(this.fb)]),
    });

    this.contractForm.get('WorkOrder')?.valueChanges.subscribe((wo) => {
      if (!wo) return;
      this.handleWorkOrderChange(wo);
    });

    this.getAllWoShortAsync();
    this.getOrderStagesShortAsync();
    this.getAllUOMAsync();

    this.isEditMode = !!this.contractId;
    if (this.isEditMode) this.isEdit();
  }

  // ── Edit Mode ─────────────────────────────────────────────
  isEdit(): void {
    if (this.contractId) this.loadContractForEdit(this.contractId);
  }

  loadContractForEdit(contractId: number): void {
    this.isLoadingContract.set(true);
    this.contractFormService.loadContractForEdit(contractId).subscribe({
      next: (res: any) => {
        if (res?.Code === 200 && res.Data) {
          this.contractId = res.Data.data.contract_Id;
          this.populateFormFromApi(res.Data.data);
        }
        this.isLoadingContract.set(false);
      },
      error: () => this.isLoadingContract.set(false),
    });
  }

  populateFormFromApi(data: ContractsMasterDto): void {
    this.contractForm.patchValue({ WorkOrder: data.wo });

    const stage_Ids = data.stagesList?.map((s) => s.stage_Id.toString()) || [];
    this.contractForm.patchValue({ Stages: stage_Ids });
    this.previousSelectedStages = [...stage_Ids];

    stage_Ids?.forEach((id) => this.loadStageData(+id, data.wo ?? null, true, 0));
    data.stagesList?.forEach((stage) => this.populateStageForm(stage, data.wo ?? null));
  }

  populateStageForm(stage: ContractsStagesDto, wo: number | null | undefined): void {
    const stage_Id = stage.stage_Id;

    if (stage_Id === 0) {
      const row = stage.stageDtlList[0];
      if (!row) return;
      this.contractForm.patchValue({
        yarnStage: {
          party_Id: row.party_Id != null ? row.party_Id.toString() : null,
          qty: row.req_Qty ?? null,
          uom_Id: row.uom != null ? row.uom.toString() : null,
          fromDate: row.plan_SDat ? row.plan_SDat.split('T')[0] : null,
          toDate: row.plan_EDat ? row.plan_EDat.split('T')[0] : null,
        },
      });
      const yarnArray = this.yarnItems;
      yarnArray.clear();
      const mats = row.materialsList?.length ? row.materialsList : [{ item_Id: null, qty: null }];
      mats.forEach((m) => {
        yarnArray.push(
          this.fb.group({
            material_Id: [m.item_Id ?? 0],
            fiber_Qty: [(m as ContractsMaterialsDto).qty ?? 0],
            material_RowId: [(m as ContractsMaterialsDto).material_RowId ?? 0],
          }),
        );
      });
      (this.yarnStage as any)['_stage_RowId'] = row.stage_RowId;
    } else if (stage_Id === 1) {
      const arr = this.knittingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(createKnittingEntry(this.fb));
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = createKnittingEntry(this.fb);
        entry.patchValue({
          party_Id: row.party_Id != null ? row.party_Id.toString() : null,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom != null ? row.uom.toString() : null,
          fromDate: row.plan_SDat ? row.plan_SDat.split('T')[0] : null,
          toDate: row.plan_EDat ? row.plan_EDat.split('T')[0] : null,
          stage_RowId: row.stage_RowId ?? 0,
        });

        const requiredMats = row.materialsList?.filter((m) => m.mat_Type === 'R') ?? [];
        const inputMats = row.materialsList?.filter((m) => m.mat_Type === 'I') ?? [];
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();

        if (requiredMats.length) {
          requiredMats.forEach((reqMat) => {
            const reqItem = createKnittingRequiredItem(this.fb);
            reqItem.patchValue({
              material_Id: reqMat.item_Id ?? 0,
              item1_Qty: reqMat.qty ?? 0,
              material_RowId: reqMat.material_RowId ?? 0,
            });

            if (wo && reqMat.item_Id)
              this.GetAllItemsByStageIdAsync(wo, 1, false, [reqMat.item_Id.toString()]);
            const childInputs = inputMats.filter(
              (m) => m.parent_Mat_RowId === reqMat.material_RowId,
            );
            const inputArr = reqItem.get('inputItems') as FormArray;
            inputArr.clear();

            if (childInputs.length) {
              childInputs.forEach((inp) => {
                const inpItem = createMaterialItem(this.fb, 'item2_Qty');
                inpItem.patchValue({
                  material_Id: inp.item_Id ?? 0,
                  item2_Qty: inp.qty ?? 0,
                  material_RowId: inp.material_RowId ?? 0,
                });
                inputArr.push(inpItem);
              });
            }
            reqArr.push(reqItem);
          });
        } else {
          reqArr.push(createKnittingRequiredItem(this.fb));
        }
        arr.push(entry);
      });
    } else if (stage_Id === 2) {
      const arr = this.dyeingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(createDyeingEntry(this.fb));
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = createDyeingEntry(this.fb);
        entry.patchValue({
          party_Id: row.party_Id != null ? row.party_Id.toString() : null,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom != null ? row.uom.toString() : null,
          fromDate: row.plan_SDat ? row.plan_SDat.split('T')[0] : null,
          toDate: row.plan_EDat ? row.plan_EDat.split('T')[0] : null,
          stage_RowId: row.stage_RowId ?? 0,
          color_Id: row.color_Id ?? 0,
        });
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();
        const reqMats = row.materialsList?.length ? row.materialsList : [{}];
        reqMats.forEach(() => reqArr.push(createColorItemGroup(this.fb)));
        arr.push(entry);
      });
    } else {
      const arr = this.cuttingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(createCuttingEntry(this.fb));
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = createCuttingEntry(this.fb);
        entry.patchValue({
          party_Id: row.party_Id != null ? row.party_Id.toString() : null,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom != null ? row.uom.toString() : null,
          fromDate: row.plan_SDat ? row.plan_SDat.split('T')[0] : null,
          toDate: row.plan_EDat ? row.plan_EDat.split('T')[0] : null,
          stage_RowId: row.stage_RowId ?? 0,
          color_Id: row.color_Id ?? 0,
          size_Id: row.size_Id ?? 0,
        });
        arr.push(entry);
      });
    }
  }

  private updateFormAfterSave(saved: ContractsStagesDtlDto): void {
    const stageId = saved.stage_Id ?? 0;
    if (stageId !== 1) return;

    const rowIndex = this.knittingStage.controls.findIndex(
      (c) => c.value.stage_RowId === saved.stage_RowId || c.value.stage_RowId === 0,
    );
    if (rowIndex === -1) return;

    this.knittingStage.at(rowIndex).patchValue({ stage_RowId: saved.stage_RowId });

    const reqArr = this.getKnittingRequired(rowIndex);
    const requiredMats = saved.materialsList?.filter((m) => m.mat_Type === 'R') ?? [];
    const inputMats = saved.materialsList?.filter((m) => m.mat_Type === 'I') ?? [];

    reqArr.controls.forEach((reqCtrl, ii) => {
      const reqMat = requiredMats[ii];
      if (reqMat) reqCtrl.patchValue({ material_RowId: reqMat.material_RowId ?? 0 });

      const inputArr = this.getKnittingInputItems(rowIndex, ii);
      const childInputs = inputMats.filter((m) => m.parent_Mat_RowId === reqMat?.material_RowId);
      childInputs.forEach((inp, iii) => {
        if (inputArr.at(iii))
          inputArr.at(iii).patchValue({ material_RowId: inp.material_RowId ?? 0 });
      });
    });
  }

  // ── Work Order Change ─────────────────────────────────────
  handleWorkOrderChange(wo: number) {
    if (!this.isEditMode) {
      this.allPartiesByStage.set({});
      this.allMaterialsByStage.set({});
      this.resetStageForms();
    }
    const stages = this.contractForm.get('Stages')?.value || [];
    stages.forEach((stage_Id: number) => this.loadStageData(stage_Id, wo, true, 0));
  }

  resetStageForms() {
    this.contractForm.patchValue({ yarnStage: createYarnEntry(this.fb).value });
    this.contractForm.setControl('knittingStage', this.fb.array([createKnittingEntry(this.fb)]));
    this.contractForm.setControl('dyeingStage', this.fb.array([createDyeingEntry(this.fb)]));
    this.contractForm.setControl('cuttingStage', this.fb.array([createCuttingEntry(this.fb)]));
  }

  loadStageData(
    stage_Id: number,
    wo: number | null | undefined,
    isParent: boolean,
    parentId: number,
  ) {
    if (wo && !this.allMaterialsByStage()[stage_Id])
      this.GetAllItemsByStageIdAsync(wo, stage_Id, isParent, [parentId.toString()]);
    if (!this.allPartiesByStage()[stage_Id]) this.getAllPartiesBystage_IdAsync(stage_Id);
  }

  // ── Stepper ───────────────────────────────────────────────
  onStageChange(selectedStages: string[]) {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const newStages = selectedStages.filter((s) => !this.previousSelectedStages.includes(s));
    newStages.forEach((stage_Id) => {
      if (wo) this.loadStageData(+stage_Id, wo, true, 0);
    });

    const removedStages = this.previousSelectedStages.filter((s) => !selectedStages.includes(s));
    if (removedStages.length > 0) this.removeStageData(removedStages.map((s) => +s));

    this.previousSelectedStages = [...selectedStages];

    const active = this.getActiveStepLabels();
    const isStillSelected = active.some((s) => s.index === this.step());
    if (!isStillSelected && active.length > 0) this.step.set(active[0].index);
  }

  onMaterialChange(value: any, ri: number, ii: number) {
    const materials = this.getMaterialItemsByStage(this.step());
    if (this.step() == 0) {
      const selected = materials.find((m) => m.fiber_Id === value);
      if (!selected) return;
      this.yarnItems.at(ii).patchValue({ fiber_Qty: selected.fiber_Qty || 0 });
    } else if (this.step() == 1) {
      const selected = materials.find((m) => m.item1 === value);
      if (!selected) return;
      const knittingGroup = this.knittingStage.at(ri) as FormGroup;
      const requiredArray = knittingGroup.get('required') as FormArray;
      requiredArray.at(ii).patchValue({ item1_Qty: selected.item1_Qty || 0 });
      this.GetAllItemsByStageIdAsync(
        this.contractForm.get('WorkOrder')?.value,
        this.step(),
        false,
        value,
      );
    }
  }

  removeStageData(stage_Ids: number[]) {
    this.allMaterialsByStage.update((prev) => {
      const updated = { ...prev };
      stage_Ids.forEach((id) => delete updated[id]);
      return updated;
    });
    this.allPartiesByStage.update((prev) => {
      const updated = { ...prev };
      stage_Ids.forEach((id) => delete updated[id]);
      return updated;
    });
  }

  getActiveStepLabels(): { index: number; label: string }[] {
    const selected: string[] = this.contractForm?.get('Stages')?.value || [];
    return this.allContarctStages()
      .filter((s) => selected.includes(s.value.toString()))
      .map((s) => ({ index: Number(s.value), label: s.viewValue }))
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
    const idx = active.findIndex((s) => s.index === this.step());
    if (idx !== -1 && idx < active.length - 1) this.step.set(active[idx + 1].index);
  }

  stepMinus() {
    const active = this.getActiveStepLabels();
    const idx = active.findIndex((s) => s.index === this.step());
    if (idx > 0) this.step.set(active[idx - 1].index);
  }

  getCurrentStageLabel(): string {
    return this.getActiveStepLabels().find((s) => s.index === this.step())?.label ?? '';
  }

  // ── Knitting Hover Helpers ────────────────────────────────
  setHoveredRequired(ri: number, ii: number) {
    this.hoveredRequiredIndex.update((prev) => ({ ...prev, [ri]: ii }));
    this.getInputItemsByRow(ri);
  }
  getHoveredRequired(ri: number): number {
    return this.hoveredRequiredIndex()[ri] ?? 0;
  }
  getHoveredRequiredLabel(ri: number): string {
    const ii = this.getHoveredRequired(ri);
    const materialId = this.getKnittingRequired(ri).at(ii)?.value?.material_Id;
    if (!materialId) return 'Input Items';
    const found = this.getMaterialItemsByStage(1).find((m) => m.item1 === materialId);
    return found?.item_Ds1 ?? 'Input Items';
  }
  getInputItemsByRow(ri: number): GetWoItemsDto[] {
    const ii = this.getHoveredRequired(ri);
    const item1 = this.getKnittingRequired(ri).at(ii)?.value?.material_Id;
    return this.allInputItemsByKnittingRow()[item1] || [];
  }
  getInputItemsByRequiredItem(ri: number, ii: number): GetWoItemsDto[] {
    const item1 = this.getKnittingRequired(ri).at(ii)?.value?.material_Id;
    return this.allInputItemsByKnittingRow()[item1] || [];
  }
  getAvailableRequiredItems(ri: number, ii: number): GetWoItemsDto[] {
    const selected = this.getKnittingRequired(ri)
      .controls.filter((_, idx) => idx !== ii)
      .map((c) => c.value.material_Id)
      .filter((id) => id && id !== 0);
    return this.getMaterialItemsByStage(1).filter((m) => !selected.includes(m.item1));
  }
  getAvailableInputItems(ri: number, ii: number, iii: number): GetWoItemsDto[] {
    const selected = this.getKnittingInputItems(ri, ii)
      .controls.filter((_, idx) => idx !== iii)
      .map((c) => c.value.material_Id)
      .filter((id) => id && id !== 0);
    return this.getInputItemsByRequiredItem(ri, ii).filter((m) => !selected.includes(m.item2));
  }
  onInputItemChange(value: any, ri: number, ii: number, iii: number): void {
    const items = this.getInputItemsByRequiredItem(ri, ii);
    const selected = items.find((m) => m.item2 === value);
    if (!selected) return;
    this.getKnittingInputItems(ri, ii)
      .at(iii)
      .patchValue({ item2_Qty: selected.item2_Qty ?? 0 });
  }

  // ── Stage Save Status ─────────────────────────────────────
  getStageSaveStatus(stage_Id: number): 'saving' | 'saved' | 'error' | null {
    return this.stageSaveStatus()[stage_Id] ?? 0;
  }
  isStageSaving(stage_Id: number): boolean {
    return this.stageSaveStatus()[stage_Id] === 'saving';
  }

  // ── Form Accessors: Yarn ──────────────────────────────────
  get yarnStage(): FormGroup {
    return this.contractForm.get('yarnStage') as FormGroup;
  }
  get yarnItems(): FormArray {
    return this.yarnStage.get('yarnItems') as FormArray;
  }
  addYarnItem() {
    this.yarnItems.push(createMaterialItem(this.fb, 'fiber_Qty'));
  }

  // ── Form Accessors: Knitting ──────────────────────────────
  get knittingStage(): FormArray {
    return this.contractForm.get('knittingStage') as FormArray;
  }
  addKnittingRow() {
    this.knittingStage.push(createKnittingEntry(this.fb));
  }
  getKnittingRequired(ri: number): FormArray {
    return this.knittingStage.at(ri).get('required') as FormArray;
  }
  getKnittingInputItems(ri: number, ii: number): FormArray {
    return this.getKnittingRequired(ri).at(ii).get('inputItems') as FormArray;
  }
  addKnittingRequired(ri: number) {
    this.getKnittingRequired(ri).push(createKnittingRequiredItem(this.fb));
  }
  addKnittingInputItem(ri: number, ii: number) {
    this.getKnittingInputItems(ri, ii).push(createMaterialItem(this.fb, 'item2_Qty'));
  }
  removeKnittingInputItem(ri: number, ii: number, iii: number) {
    const arr = this.getKnittingInputItems(ri, ii);
    const materialRowId = arr.at(iii).value.material_RowId;
    if (!materialRowId || materialRowId === 0) {
      if (arr.length > 1) arr.removeAt(iii);
      return;
    }
    this.contractFormService
      .removeMaterialItemApi(materialRowId)
      .then(() => {
        if (arr.length > 1) arr.removeAt(iii);
      })
      .catch(() => console.error('Failed to remove knitting input item'));
  }

  // ── Form Accessors: Dyeing ────────────────────────────────
  get dyeingStage(): FormArray {
    return this.contractForm.get('dyeingStage') as FormArray;
  }
  addDyeingRow() {
    this.dyeingStage.push(createDyeingEntry(this.fb));
  }
  getDyeingRequired(ri: number): FormArray {
    return this.dyeingStage.at(ri).get('required') as FormArray;
  }
  getDyeingColorItems(ri: number, ci: number): FormArray {
    return this.getDyeingRequired(ri).at(ci).get('items') as FormArray;
  }
  getDyeingInput(ri: number): FormArray {
    return this.dyeingStage.at(ri).get('input') as FormArray;
  }
  addDyeingColorGroup(ri: number) {
    this.getDyeingRequired(ri).push(createColorItemGroup(this.fb));
  }
  addDyeingColorItem(ri: number, ci: number) {
    this.getDyeingColorItems(ri, ci).push(createMaterialItem(this.fb, 'qty'));
  }
  addDyeingInput(ri: number) {
    this.getDyeingInput(ri).push(createMaterialItem(this.fb, 'qty'));
  }

  // ── Form Accessors: Cutting ───────────────────────────────
  get cuttingStage(): FormArray {
    return this.contractForm.get('cuttingStage') as FormArray;
  }
  addCuttingRow() {
    this.cuttingStage.push(createCuttingEntry(this.fb));
  }
  getCuttingRequired(ri: number): FormArray {
    return this.cuttingStage.at(ri).get('required') as FormArray;
  }
  getCuttingRequiredSizes(ri: number, ci: number): FormArray {
    return this.getCuttingRequired(ri).at(ci).get('sizes') as FormArray;
  }
  getCuttingRequiredSizeItems(ri: number, ci: number, si: number): FormArray {
    return this.getCuttingRequiredSizes(ri, ci).at(si).get('items') as FormArray;
  }
  getCuttingInput(ri: number): FormArray {
    return this.cuttingStage.at(ri).get('input') as FormArray;
  }
  getCuttingInputItems(ri: number, ci: number): FormArray {
    return this.getCuttingInput(ri).at(ci).get('items') as FormArray;
  }
  addCuttingColorGroup(ri: number) {
    this.getCuttingRequired(ri).push(createColorSizeGroup(this.fb));
  }
  addCuttingSize(ri: number, ci: number) {
    this.getCuttingRequiredSizes(ri, ci).push(createSizeItemGroup(this.fb));
  }
  addCuttingSizeItem(ri: number, ci: number, si: number) {
    this.getCuttingRequiredSizeItems(ri, ci, si).push(createMaterialItem(this.fb, 'qty'));
  }
  addCuttingInputColor(ri: number) {
    this.getCuttingInput(ri).push(createColorItemGroup(this.fb));
  }
  addCuttingInputItem(ri: number, ci: number) {
    this.getCuttingInputItems(ri, ci).push(createMaterialItem(this.fb, 'qty'));
  }

  // ── LOV Loading ───────────────────────────────────────────
  getAllWoShortAsync() {
    this.contractFormService.getAllWoShortAsync().subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allWos.set(res.Data);
    });
  }

  getOrderStagesShortAsync() {
    this.contractFormService.getOrderStagesShortAsync().subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allContarctStages.set(res.Data);
    });
  }

  getPartiesByStage(stage_Id: number): SelectionValueModel[] {
    return this.allPartiesByStage()[stage_Id] || [];
  }

  getAllPartiesBystage_IdAsync(stage_Id: number) {
    this.contractFormService.getAllPartiesBystage_IdAsync(stage_Id).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data)
        this.allPartiesByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
    });
  }

  getAllUOMAsync() {
    this.contractFormService.getAllUOMAsync().subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allUoms.set(res.Data);
    });
  }

  getMaterialItemsByStage(stage_Id: number): GetWoItemsDto[] {
    return this.allMaterialsByStage()[stage_Id] || [];
  }

  GetAllItemsByStageIdAsync(wo: number, stage_Id: number, isParent: boolean, params?: string[]) {
    this.contractFormService
      .GetAllItemsByStageIdAsync(wo, stage_Id, isParent, params)
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data) {
          if (stage_Id === 0 || stage_Id === 1) {
            if (isParent)
              this.allMaterialsByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
            else {
              let parentId = 0;
              if (params && params.length > 0) {
                parentId = parseInt(params[0]);
              }
              this.allInputItemsByKnittingRow.update((prev) => ({ ...prev, [parentId]: res.Data }));
            }
          }
        }
      });
  }

  // ── DTO Builders ──────────────────────────────────────────
  buildStageDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    if (stage_Id === 0) return this.buildYarnDtos(stage_Id, contractId);
    if (stage_Id === 1) return this.buildKnittingDtos(stage_Id, contractId);
    if (stage_Id === 2) return this.buildDyeingDtos(stage_Id, contractId);
    return this.buildCuttingDtos(stage_Id, contractId);
  }

  private buildYarnDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    const v = this.yarnStage.value;
    const materials: ContractsMaterialsDto[] = (v.yarnItems || []).map((m: any) => ({
      material_RowId: m.material_RowId ?? 0,
      item_Id: m.material_Id ?? 0,
      qty: m.fiber_Qty ?? 0,
      is_Active: 'Y',
    }));
    return [
      {
        contract_Id: contractId,
        stage_Id,
        stage_RowId: (this.yarnStage as any)['_stage_RowId'] ?? 0,
        party_Id: v.party_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_SDat: v.fromDate ?? null,
        plan_EDat: v.toDate ?? null,
        is_Active: 'Y',
        materialsList: materials,
      },
    ];
  }

  private buildKnittingDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    return this.knittingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = [];
      (v.required || []).forEach((req: any) => {
        const reqMatRowId = req.material_RowId ?? 0;
        materials.push({
          material_RowId: reqMatRowId,
          item_Id: req.material_Id ?? 0,
          qty: req.item1_Qty ?? 0,
          is_Active: 'Y',
          mat_Type: 'R',
          parent_Mat_RowId: 0,
        });
        (req.inputItems || []).forEach((inp: any) => {
          materials.push({
            material_RowId: inp.material_RowId ?? 0,
            item_Id: inp.material_Id ?? 0,
            qty: inp.item2_Qty ?? 0,
            is_Active: 'Y',
            mat_Type: 'I',
            parent_Mat_RowId: reqMatRowId,
          });
        });
      });
      return {
        contract_Id: contractId,
        stage_Id,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_SDat: v.fromDate ?? null,
        plan_EDat: v.toDate ?? null,
        is_Active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  private buildDyeingDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    return this.dyeingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = (v.input || []).map((m: any) => ({
        material_RowId: m.material_RowId ?? 0,
        item_Id: m.material_Id ?? 0,
        qty: m.qty ?? 0,
        is_Active: 'Y',
      }));
      return {
        contract_Id: contractId,
        stage_Id,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        color_Id: v.color_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_SDat: v.fromDate ?? null,
        plan_EDat: v.toDate ?? null,
        is_Active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  private buildCuttingDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    return this.cuttingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = [];
      (v.input || []).forEach((colorGroup: any) => {
        (colorGroup.items || []).forEach((m: any) => {
          materials.push({
            material_RowId: m.material_RowId ?? 0,
            item_Id: m.material_Id ?? 0,
            qty: m.qty ?? 0,
            is_Active: 'Y',
          });
        });
      });
      return {
        contract_Id: contractId,
        stage_Id,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        color_Id: v.color_Id ?? 0,
        size_Id: v.size_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_SDat: v.fromDate ?? null,
        plan_EDat: v.toDate ?? null,
        is_Active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  // ── Save ──────────────────────────────────────────────────
  onSubmit() {
    if (!this.contractForm.valid) return;

    const saveAll = () => {
      const active = this.getActiveStepLabels();
      return active.reduce((chain, stage) => {
        return chain.then(() => {
          const dtos = this.buildStageDtos(stage.index, this.contractId!);
          return dtos.reduce(
            (c, dto) =>
              c.then(() =>
                this.contractFormService
                  .saveStageRow(dto)
                  .then((saved) => this.updateFormAfterSave(saved)),
              ),
            Promise.resolve(),
          );
        });
      }, Promise.resolve());
    };

    const afterSave = () => {
      this.isEditMode = !!this.contractId;
      if (this.isEditMode) this.isEdit();
    };

    if (!this.contractId) {
      this.saveMaster((contractId: number) => {
        this.contractId = contractId;
        saveAll()
          .then(afterSave)
          .catch((err) => console.error('Save failed:', err));
      });
    } else {
      saveAll()
        .then(afterSave)
        .catch((err) => console.error('Save failed:', err));
    }
  }

  private saveMaster(onSuccess: (contractId: number) => void): void {
    const masterDto: ContractsMasterDto = {
      contract_Id: this.contractId ?? 0,
      wo: this.contractForm.get('WorkOrder')?.value,
      lock_Flag: 'N',
    };
    this.contractFormService.saveMaster(masterDto).subscribe({
      next: (res: any) => {
        if (res?.Code === 200 && res.Data?.contract_Id) {
          onSuccess(res.Data.contract_Id);
        } else {
          this.stageSaveStatus.update((s) => ({ ...s, [this.step()]: 'error' }));
        }
      },
      error: () => this.stageSaveStatus.update((s) => ({ ...s, [this.step()]: 'error' })),
    });
  }

  // ── Delete ────────────────────────────────────────────────
  removeStageRow(stageRowId: number, stageId: number, rowIndex: number): void {
    if (!stageRowId || stageRowId === 0) {
      this.removeStageRowFromForm(stageId, rowIndex);
      return;
    }
    this.contractFormService.removeStageRowApi(stageRowId).subscribe({
      next: (res: any) => {
        if (res === true) this.removeStageRowFromForm(stageId, rowIndex);
      },
      error: () => console.error('Failed to remove stage row'),
    });
  }

  private removeStageRowFromForm(stageId: number, rowIndex: number): void {
    if (stageId === 1 && this.knittingStage.length > 1) this.knittingStage.removeAt(rowIndex);
    else if (stageId === 2 && this.dyeingStage.length > 1) this.dyeingStage.removeAt(rowIndex);
    else if (stageId >= 3 && this.cuttingStage.length > 1) this.cuttingStage.removeAt(rowIndex);
  }

  removeMaterialItem(
    materialRowId: number,
    stageId: number,
    rowIndex: number,
    itemIndex: number,
  ): void {
    if (!materialRowId || materialRowId === 0) {
      this.removeMaterialFromForm(stageId, rowIndex, itemIndex);
      return;
    }
    this.contractFormService.removeStageRowApi(materialRowId).subscribe({
      next: (res: any) => {
        if (res === true) this.removeMaterialFromForm(stageId, rowIndex, itemIndex);
      },
      error: () => console.error('Failed to remove material item'),
    });
  }

  private removeMaterialFromForm(stageId: number, rowIndex: number, itemIndex: number): void {
    if (stageId === 0 && this.yarnItems.length > 1) this.yarnItems.removeAt(itemIndex);
    else if (stageId === 1) {
      const arr = this.getKnittingRequired(rowIndex);
      if (arr.length > 1) arr.removeAt(itemIndex);
    } else if (stageId === 2) {
      const arr = this.getDyeingInput(rowIndex);
      if (arr.length > 1) arr.removeAt(itemIndex);
    }
  }

  removeDyeingColorGroupWithDb(ri: number, ci: number): void {
    const materialIds = this.getDyeingColorItems(ri, ci)
      .controls.map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);
    if (materialIds.length === 0) {
      if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci);
      return;
    }
    materialIds
      .reduce(
        (chain, id) => chain.then(() => this.contractFormService.removeMaterialItemApi(id)),
        Promise.resolve(),
      )
      .then(() => {
        if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove dyeing color group items'));
  }

  removeCuttingColorGroupWithDb(ri: number, ci: number): void {
    const materialIds: number[] = [];
    this.getCuttingRequiredSizes(ri, ci).controls.forEach((sg) => {
      (sg.get('items') as FormArray).controls.forEach((item) => {
        const id = item.value.material_RowId;
        if (id && id !== 0) materialIds.push(id);
      });
    });
    if (materialIds.length === 0) {
      if (this.getCuttingRequired(ri).length > 1) this.getCuttingRequired(ri).removeAt(ci);
      return;
    }
    materialIds
      .reduce(
        (chain, id) => chain.then(() => this.contractFormService.removeMaterialItemApi(id)),
        Promise.resolve(),
      )
      .then(() => {
        if (this.getCuttingRequired(ri).length > 1) this.getCuttingRequired(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove cutting color group items'));
  }

  removeCuttingSizeWithDb(ri: number, ci: number, si: number): void {
    const materialIds = this.getCuttingRequiredSizeItems(ri, ci, si)
      .controls.map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);
    if (materialIds.length === 0) {
      if (this.getCuttingRequiredSizes(ri, ci).length > 1)
        this.getCuttingRequiredSizes(ri, ci).removeAt(si);
      return;
    }
    materialIds
      .reduce(
        (chain, id) => chain.then(() => this.contractFormService.removeMaterialItemApi(id)),
        Promise.resolve(),
      )
      .then(() => {
        if (this.getCuttingRequiredSizes(ri, ci).length > 1)
          this.getCuttingRequiredSizes(ri, ci).removeAt(si);
      })
      .catch(() => console.error('Failed to remove cutting size items'));
  }

  removeCuttingInputColorWithDb(ri: number, ci: number): void {
    const materialIds = this.getCuttingInputItems(ri, ci)
      .controls.map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);
    if (materialIds.length === 0) {
      if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci);
      return;
    }
    materialIds
      .reduce(
        (chain, id) => chain.then(() => this.contractFormService.removeMaterialItemApi(id)),
        Promise.resolve(),
      )
      .then(() => {
        if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove cutting input color items'));
  }

  removeCuttingSizeItemWithDb(ri: number, ci: number, si: number, ii: number): void {
    const materialRowId = this.getCuttingRequiredSizeItems(ri, ci, si).at(ii).value.material_RowId;
    if (!materialRowId || materialRowId === 0) {
      if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1)
        this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii);
      return;
    }
    this.contractFormService
      .removeMaterialItemApi(materialRowId)
      .then(() => {
        if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1)
          this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii);
      })
      .catch(() => console.error('Failed to remove cutting size item'));
  }

  removeCuttingInputItemWithDb(ri: number, ci: number, ii: number): void {
    const materialRowId = this.getCuttingInputItems(ri, ci).at(ii).value.material_RowId;
    if (!materialRowId || materialRowId === 0) {
      if (this.getCuttingInputItems(ri, ci).length > 1)
        this.getCuttingInputItems(ri, ci).removeAt(ii);
      return;
    }
    this.contractFormService
      .removeMaterialItemApi(materialRowId)
      .then(() => {
        if (this.getCuttingInputItems(ri, ci).length > 1)
          this.getCuttingInputItems(ri, ci).removeAt(ii);
      })
      .catch(() => console.error('Failed to remove cutting input item'));
  }

  // ── Navigation ────────────────────────────────────────────
  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value);
  }
}
