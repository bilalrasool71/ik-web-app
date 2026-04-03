import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel } from '../../core/models/api.model';
import { GetWoItemsDto } from '../../models/domain/GetWoItem.model';
import {
  ContractsMasterDto,
  ContractsMaterialsDto,
  ContractsStagesDtlDto,
  ContractsStagesDto,
} from '../../models/domain/ContractsMasterDto';

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
  /**
   * Pass contractId from the parent grid for edit mode.
   * Leave null / undefined for new-record mode.
   */
  @Input() contractId: number | null = null;

  // ── Injections ────────────────────────────────────────────
  restService = inject(IkgsRest);
  http = inject(HttpClient);
  router = inject(Router);
  fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);

  // ── State ─────────────────────────────────────────────────
  contractForm!: FormGroup;
  step = signal(0);
  previousSelectedStages: string[] = [];

  /** Holds the saved Contract_Id (set after first master save in new mode) */
  savedContractId: number | null = null;

  /** Tracks per-stage save status: key = stageId, value = 'saving' | 'saved' | 'error' */
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

  // ── Lifecycle ─────────────────────────────────────────────

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const id = params['contractId'];
      if (id) {
        this.contractId = +id;
      }
    });

    this.isEditMode = !!this.contractId;

    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: [[]],
      yarnStage: this.createYarnEntry(),
      knittingStage: this.fb.array([this.createKnittingEntry()]),
      dyeingStage: this.fb.array([this.createDyeingEntry()]),
      cuttingStage: this.fb.array([this.createCuttingEntry()]),
    });

    this.contractForm.get('WorkOrder')?.valueChanges.subscribe((wo) => {
      if (!wo) return;
      this.handleWorkOrderChange(wo);
    });

    // Load all LOVs
    this.getAllWoShortAsync();
    this.getOrderStagesShortAsync();
    this.getAllUOMAsync();

    // If edit mode, load after LOVs settle (slight defer so LOVs are ready)
    if (this.isEditMode && this.contractId) {
      this.loadContractForEdit(this.contractId);
    }
  }

  // ── Edit Mode: Load & Populate ────────────────────────────

  loadContractForEdit(contractId: number): void {
    this.isLoadingContract.set(true);
    const opts = new ApiOptionsModel<ContractsMasterDto>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetContractByIdAsync;
    opts.ReqQueryParams = [{ Key: 'contractId', Value: contractId, IsDate: false }];

    this.restService.CallApi<ContractsMasterDto, ContractsMasterDto>(opts).subscribe({
      next: (res: any) => {
        if (res?.Code === 200 && res.Data) {
          this.savedContractId = res.Data.data.contract_Id;
          this.populateFormFromApi(res.Data.data);
        }
        this.isLoadingContract.set(false);
      },
      error: () => this.isLoadingContract.set(false),
    });
  }

  populateFormFromApi(data: ContractsMasterDto): void {
    // 1. Patch master fields
    this.contractForm.patchValue({ WorkOrder: data.wo });

    // 2. Determine selected stage IDs
    const stageIds = data.stagesList?.map((s) => s.stage_Id.toString()) || [];
    this.contractForm.patchValue({ Stages: stageIds });
    this.previousSelectedStages = [...stageIds];

    // 3. Load LOV data for each stage
    stageIds?.forEach((id) => this.loadStageData(+id, data.wo ?? null));

    // 4. Populate each stage form section
    data.stagesList?.forEach((stage) => {
      this.populateStageForm(stage, data.wo ?? null);
    });
  }

  populateStageForm(stage: ContractsStagesDto, wo: number | null | undefined): void {
    const stageId = stage.stage_Id;

    if (stageId === 0) {
      // Yarn — single entry, use first row
      const row = stage.stageDtlList[0];
      if (!row) return;
      this.contractForm.patchValue({
        yarnStage: {
          party_Id: row.party_Id ?? null,
          qty: row.req_Qty ?? null,
          uom_Id: row.uom ?? null,
          fromDate: row.plan_SDat ? new Date(row.plan_SDat) : null,
          toDate: row.plan_EDat ? new Date(row.plan_EDat) : null,
        },
      });
      // Yarn items (materials)
      const yarnArray = this.yarnItems;
      yarnArray.clear();
      const mats = row.materialsList?.length ? row.materialsList : [{ item_Id: null, Qty: null }];
      mats.forEach((m) => {
        yarnArray.push(
          this.fb.group({
            material_Id: [m.item_Id ?? 0],
            qty: [(m as any).Qty ?? 0],
            material_RowId: [(m as ContractsMaterialsDto).material_RowId ?? 0],
          }),
        );
      });
      // Store stage_RowId on the yarnStage group for save mapping
      (this.yarnStage as any)['_stage_RowId'] = row.stage_RowId;
    } else if (stageId === 1) {
      // Knitting — multiple rows
      const arr = this.knittingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(this.createKnittingEntry());
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = this.createKnittingEntry();
        entry.patchValue({
          party_Id: row.party_Id ?? 0,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom ?? 0,
          fromDate: row.plan_SDat ? new Date(row.plan_SDat) : null,
          toDate: row.plan_EDat ? new Date(row.plan_EDat) : null,
          stage_RowId: row.stage_RowId ?? 0,
        });
        // Required materials
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();
        const reqMats = row.materialsList?.length
          ? row.materialsList
          : [{ item_Id: 0, Qty: 0, Material_RowId: 0 }];
        reqMats.forEach((m) =>
          reqArr.push(
            this.fb.group({
              material_Id: [m.item_Id ?? 0],
              qty: [(m as any).Qty ?? 0],
              material_RowId: [(m as ContractsMaterialsDto).material_RowId ?? 0],
            }),
          ),
        );
        arr.push(entry);
      });
    } else if (stageId === 2) {
      // Dyeing — multiple rows, with color grouping
      const arr = this.dyeingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(this.createDyeingEntry());
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = this.createDyeingEntry();
        entry.patchValue({
          party_Id: row.party_Id ?? 0,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom ?? 0,
          fromDate: row.plan_SDat ? new Date(row.plan_SDat) : null,
          toDate: row.plan_EDat ? new Date(row.plan_EDat) : null,
          stage_RowId: row.stage_RowId ?? 0,
          color_Id: row.color_Id ?? 0,
        });
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();
        const reqMats = row.materialsList?.length ? row.materialsList : [{}];
        reqMats.forEach(() => reqArr.push(this.createColorItemGroup()));
        arr.push(entry);
      });
    } else {
      // Cutting (stage >= 3) — multiple rows with color + size grouping
      const arr = this.cuttingStage;
      arr.clear();
      if (!stage.stageDtlList.length) {
        arr.push(this.createCuttingEntry());
        return;
      }
      stage.stageDtlList.forEach((row) => {
        const entry = this.createCuttingEntry();
        entry.patchValue({
          party_Id: row.party_Id ?? 0,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom ?? 0,
          fromDate: row.plan_SDat ? new Date(row.plan_SDat) : null,
          toDate: row.plan_EDat ? new Date(row.plan_EDat) : null,
          stage_RowId: row.stage_RowId ?? 0,
          color_Id: row.color_Id ?? 0,
          size_Id: row.size_Id ?? 0,
        });
        arr.push(entry);
      });
    }
  }

  // ── Work Order Change ─────────────────────────────────────

  handleWorkOrderChange(wo: number) {
    if (!this.isEditMode) {
      // Only reset in new mode; in edit mode data is pre-loaded
      this.allPartiesByStage.set({});
      this.allMaterialsByStage.set({});
      this.resetStageForms();
    }
    const stages = this.contractForm.get('Stages')?.value || [];
    stages.forEach((stageId: number) => this.loadStageData(stageId, wo));
  }

  resetStageForms() {
    this.contractForm.patchValue({ yarnStage: this.createYarnEntry().value });
    this.contractForm.setControl('knittingStage', this.fb.array([this.createKnittingEntry()]));
    this.contractForm.setControl('dyeingStage', this.fb.array([this.createDyeingEntry()]));
    this.contractForm.setControl('cuttingStage', this.fb.array([this.createCuttingEntry()]));
  }

  loadStageData(stageId: number, wo: number | null | undefined) {
    if (wo) if (!this.allMaterialsByStage()[stageId]) this.getAllItemsByStageIdAsync(wo, stageId);
    if (!this.allPartiesByStage()[stageId]) this.getAllPartiesByStageIdAsync(stageId);
  }

  // ── Stepper ───────────────────────────────────────────────

  onStageChange(selectedStages: string[]) {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const newStages = selectedStages.filter((s) => !this.previousSelectedStages.includes(s));
    newStages.forEach((stageId) => {
      if (wo) this.loadStageData(+stageId, wo);
    });

    const removedStages = this.previousSelectedStages.filter((s) => !selectedStages.includes(s));
    if (removedStages.length > 0) this.removeStageData(removedStages.map((s) => +s));

    this.previousSelectedStages = [...selectedStages];

    const active = this.getActiveStepLabels();
    const isStillSelected = active.some((s) => s.index === this.step());
    if (!isStillSelected && active.length > 0) this.step.set(active[0].index);
  }

  onMaterialChange(materialId: number, index: number) {
    const materials = this.getMaterialItemsByStage(this.step());
    const selected = materials.find((m) => m.fiber_Id === materialId);
    if (!selected) return;
    this.yarnItems.at(index).patchValue({ qty: selected.qty || 0 });
  }

  removeStageData(stageIds: number[]) {
    this.allMaterialsByStage.update((prev) => {
      const updated = { ...prev };
      stageIds.forEach((id) => delete updated[id]);
      return updated;
    });
    this.allPartiesByStage.update((prev) => {
      const updated = { ...prev };
      stageIds.forEach((id) => delete updated[id]);
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

  // ── Save: Master First, Then Stage ───────────────────────

  /**
   * Called when the user clicks "Save" on any stage step.
   * - If no savedContractId yet → saves master first, then the stage.
   * - If savedContractId exists → saves the stage directly.
   */
  saveCurrentStage(): void {
    const stageId = this.step();
    this.stageSaveStatus.update((s) => ({ ...s, [stageId]: 'saving' }));

    if (!this.savedContractId) {
      // Save master first, then save stage in callback
      this.saveMaster((contractId: number) => {
        this.savedContractId = contractId;
        this.saveStage(stageId, contractId);
      });
    } else {
      this.saveStage(stageId, this.savedContractId);
    }
  }

  private saveMaster(onSuccess: (contractId: number) => void): void {
    const masterDto: ContractsMasterDto = {
      contract_Id: this.savedContractId ?? 0,
      wo: this.contractForm.get('WorkOrder')?.value,
      lock_Flag: 'N',
      // Populate EBy / EIp from your auth service if available
    };

    const opts = new ApiOptionsModel<ContractsMasterDto>();
    opts.RequestType = RequestType.POST;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.AddUpdateMasterContractAsync;
    opts.ParamObj = masterDto;

    this.restService.CallApi<ContractsMasterDto, ContractsMasterDto>(opts).subscribe({
      next: (res: any) => {
        if (res?.Code === 200 && res.Data?.contract_Id) {
          onSuccess(res.Data.contract_Id);
        } else {
          // Mark current stage as error if master fails
          const stageId = this.step();
          this.stageSaveStatus.update((s) => ({ ...s, [stageId]: 'error' }));
        }
      },
      error: () => {
        const stageId = this.step();
        this.stageSaveStatus.update((s) => ({ ...s, [stageId]: 'error' }));
      },
    });
  }

  // ── DTO Builders ──────────────────────────────────────────

  /**
   * Converts the current form state for a given stageId into
   * an array of ContractsStagesDtlDto (one per row) ready for the API.
   */
  buildStageDtos(stageId: number, contractId: number): ContractsStagesDtlDto[] {
    if (stageId === 0) return this.buildYarnDtos(stageId, contractId);
    if (stageId === 1) return this.buildKnittingDtos(stageId, contractId);
    if (stageId === 2) return this.buildDyeingDtos(stageId, contractId);
    return this.buildCuttingDtos(stageId, contractId);
  }

  private buildYarnDtos(stageId: number, contractId: number): ContractsStagesDtlDto[] {
    const v = this.yarnStage.value;
    const materials: ContractsMaterialsDto[] = (v.yarnItems || []).map((m: any) => ({
      Material_RowId: m.material_RowId ?? 0,
      Item_Id: m.material_Id ?? 0,
      Qty: m.qty ?? 0,
      Is_Active: 'Y',
    }));

    return [
      {
        contract_Id: contractId,
        stage_Id: stageId,
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

  private buildKnittingDtos(stageId: number, contractId: number): ContractsStagesDtlDto[] {
    return this.knittingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = (v.required || []).map((m: any) => ({
        Material_RowId: m.material_RowId ?? 0,
        Item_Id: m.material_Id ?? 0,
        Qty: m.qty ?? 0,
        Is_Active: 'Y',
      }));
      return {
        contract_Id: contractId,
        stage_Id: stageId,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_sdat: v.fromDate ?? null,
        plan_edat: v.toDate ?? null,
        is_active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  private buildDyeingDtos(stageId: number, contractId: number): ContractsStagesDtlDto[] {
    return this.dyeingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = (v.input || []).map((m: any) => ({
        Material_RowId: m.material_RowId ?? 0,
        Item_Id: m.material_Id ?? 0,
        Qty: m.qty ?? 0,
        Is_Active: 'Y',
      }));
      return {
        contract_Id: contractId,
        stage_Id: stageId,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        color_id: v.color_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_sdat: v.fromDate ?? null,
        plan_edat: v.toDate ?? null,
        is_active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  private buildCuttingDtos(stageId: number, contractId: number): ContractsStagesDtlDto[] {
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
        stage_Id: stageId,
        stage_RowId: v.stage_RowId ?? 0,
        party_Id: v.party_Id ?? 0,
        color_id: v.color_Id ?? 0,
        size_id: v.size_Id ?? 0,
        req_Qty: v.qty ?? 0,
        uom: v.uom_Id ?? 0,
        plan_sdat: v.fromDate ?? 0,
        plan_edat: v.toDate ?? 0,
        is_active: 'Y',
        materialsList: materials,
      } as ContractsStagesDtlDto;
    });
  }

  // ── Stage Save Status Helpers ─────────────────────────────

  getStageSaveStatus(stageId: number): 'saving' | 'saved' | 'error' | null {
    return this.stageSaveStatus()[stageId] ?? 0;
  }

  isStageSaving(stageId: number): boolean {
    return this.stageSaveStatus()[stageId] === 'saving';
  }

  // ── Form Factories ────────────────────────────────────────

  createMaterialItem(): FormGroup {
    return this.fb.group({
      material_Id: [0],
      qty: [0],
      material_RowId: [0], // tracks existing row for update
    });
  }

  createColorItemGroup(): FormGroup {
    return this.fb.group({
      color_Id: [0],
      items: this.fb.array([this.createMaterialItem()]),
    });
  }

  createSizeItemGroup(): FormGroup {
    return this.fb.group({
      size_Id: 0,
      items: this.fb.array([this.createMaterialItem()]),
    });
  }

  createColorSizeGroup(): FormGroup {
    return this.fb.group({
      color_Id: 0,
      sizes: this.fb.array([this.createSizeItemGroup()]),
    });
  }

  createStageHeader(): object {
    return {
      stage_RowId: 0, // null = insert, value = update
      party_Id: 0,
      qty: 0,
      uom_Id: 0,
      fromDate: null,
      toDate: null,
    };
  }

  // ── Stage 0: Yarn ─────────────────────────────────────────
  createYarnEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      yarnItems: this.fb.array([this.createMaterialItem()]),
    });
  }

  get yarnStage(): FormGroup {
    return this.contractForm.get('yarnStage') as FormGroup;
  }
  get yarnItems(): FormArray {
    return this.yarnStage.get('yarnItems') as FormArray;
  }
  addYarnItem() {
    this.yarnItems.push(this.createMaterialItem());
  }
  removeYarnItem(i: number) {
    if (this.yarnItems.length > 1) this.yarnItems.removeAt(i);
  }

  // ── Stage 1: Knitting ─────────────────────────────────────
  createKnittingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      required: this.fb.array([this.createMaterialItem()]),
      input: this.fb.array([this.createMaterialItem()]),
    });
  }

  get knittingStage(): FormArray {
    return this.contractForm.get('knittingStage') as FormArray;
  }
  addKnittingRow() {
    this.knittingStage.push(this.createKnittingEntry());
  }
  removeKnittingRow(i: number) {
    if (this.knittingStage.length > 1) this.knittingStage.removeAt(i);
  }
  getKnittingRequired(ri: number): FormArray {
    return this.knittingStage.at(ri).get('required') as FormArray;
  }
  getKnittingInput(ri: number): FormArray {
    return this.knittingStage.at(ri).get('input') as FormArray;
  }
  addKnittingRequired(ri: number) {
    this.getKnittingRequired(ri).push(this.createMaterialItem());
  }
  removeKnittingRequired(ri: number, ii: number) {
    if (this.getKnittingRequired(ri).length > 1) this.getKnittingRequired(ri).removeAt(ii);
  }
  addKnittingInput(ri: number) {
    this.getKnittingInput(ri).push(this.createMaterialItem());
  }
  removeKnittingInput(ri: number, ii: number) {
    if (this.getKnittingInput(ri).length > 1) this.getKnittingInput(ri).removeAt(ii);
  }

  // ── Stage 2: Dyeing ───────────────────────────────────────
  createDyeingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      color_Id: [0],
      required: this.fb.array([this.createColorItemGroup()]),
      input: this.fb.array([this.createMaterialItem()]),
    });
  }

  get dyeingStage(): FormArray {
    return this.contractForm.get('dyeingStage') as FormArray;
  }
  addDyeingRow() {
    this.dyeingStage.push(this.createDyeingEntry());
  }
  removeDyeingRow(i: number) {
    if (this.dyeingStage.length > 1) this.dyeingStage.removeAt(i);
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
    this.getDyeingRequired(ri).push(this.createColorItemGroup());
  }
  removeDyeingColorGroup(ri: number, ci: number) {
    if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci);
  }
  addDyeingColorItem(ri: number, ci: number) {
    this.getDyeingColorItems(ri, ci).push(this.createMaterialItem());
  }
  removeDyeingColorItem(ri: number, ci: number, ii: number) {
    if (this.getDyeingColorItems(ri, ci).length > 1) this.getDyeingColorItems(ri, ci).removeAt(ii);
  }
  addDyeingInput(ri: number) {
    this.getDyeingInput(ri).push(this.createMaterialItem());
  }
  removeDyeingInput(ri: number, ii: number) {
    if (this.getDyeingInput(ri).length > 1) this.getDyeingInput(ri).removeAt(ii);
  }

  // ── Stage 3+: Cutting ─────────────────────────────────────
  createCuttingEntry(): FormGroup {
    return this.fb.group({
      ...this.createStageHeader(),
      color_Id: [null],
      size_Id: [null],
      required: this.fb.array([this.createColorSizeGroup()]),
      input: this.fb.array([this.createColorItemGroup()]),
    });
  }

  get cuttingStage(): FormArray {
    return this.contractForm.get('cuttingStage') as FormArray;
  }
  addCuttingRow() {
    this.cuttingStage.push(this.createCuttingEntry());
  }
  removeCuttingRow(i: number) {
    if (this.cuttingStage.length > 1) this.cuttingStage.removeAt(i);
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
    this.getCuttingRequired(ri).push(this.createColorSizeGroup());
  }
  removeCuttingColorGroup(ri: number, ci: number) {
    if (this.getCuttingRequired(ri).length > 1) this.getCuttingRequired(ri).removeAt(ci);
  }
  addCuttingSize(ri: number, ci: number) {
    this.getCuttingRequiredSizes(ri, ci).push(this.createSizeItemGroup());
  }
  removeCuttingSize(ri: number, ci: number, si: number) {
    if (this.getCuttingRequiredSizes(ri, ci).length > 1)
      this.getCuttingRequiredSizes(ri, ci).removeAt(si);
  }
  addCuttingSizeItem(ri: number, ci: number, si: number) {
    this.getCuttingRequiredSizeItems(ri, ci, si).push(this.createMaterialItem());
  }
  removeCuttingSizeItem(ri: number, ci: number, si: number, ii: number) {
    if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1)
      this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii);
  }
  addCuttingInputColor(ri: number) {
    this.getCuttingInput(ri).push(this.createColorItemGroup());
  }
  removeCuttingInputColor(ri: number, ci: number) {
    if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci);
  }
  addCuttingInputItem(ri: number, ci: number) {
    this.getCuttingInputItems(ri, ci).push(this.createMaterialItem());
  }
  removeCuttingInputItem(ri: number, ci: number, ii: number) {
    if (this.getCuttingInputItems(ri, ci).length > 1)
      this.getCuttingInputItems(ri, ci).removeAt(ii);
  }

  // ── API Calls ─────────────────────────────────────────────

  getAllWoShortAsync() {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllWoShortAsync;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(opts)
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data) this.allWos.set(res.Data);
      });
  }

  getOrderStagesShortAsync() {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetOrderStagesShortAsync;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(opts)
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data) this.allContarctStages.set(res.Data);
      });
  }

  getPartiesByStage(stageId: number): SelectionValueModel[] {
    return this.allPartiesByStage()[stageId] || [];
  }

  getAllPartiesByStageIdAsync(stage_Id: number) {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllPartiesByStageIdAsync;
    opts.ReqQueryParams = [{ Key: 'stageId', Value: stage_Id, IsDate: false }];
    this.restService.CallApi(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) {
        this.allPartiesByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
      }
    });
  }

  getAllUOMAsync() {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Catalog;
    opts.EndPoint = EndPoints.GetAllUOMAsync;
    opts.ReqQueryParams = [];
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(opts)
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data) this.allUoms.set(res.Data);
      });
  }

  getMaterialItemsByStage(stageId: number): GetWoItemsDto[] {
    return this.allMaterialsByStage()[stageId] || [];
  }

  getAllItemsByStageIdAsync(wo: number, stage_Id: number) {
    const opts = new ApiOptionsModel<GetWoItemsDto[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllItemsByStageIdAsync;
    opts.ReqQueryParams = [
      { Key: 'wo', Value: wo, IsDate: false },
      { Key: 'stageId', Value: stage_Id, IsDate: false },
    ];
    this.restService.CallApi<GetWoItemsDto[], GetWoItemsDto[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) {
        this.allMaterialsByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
      }
    });
  }

  // ── Misc ──────────────────────────────────────────────────

  onSubmit() {
    // Final submit: saves master + all active stages in sequence
    if (!this.contractForm.valid) return;

    const saveAll = () => {
      const active = this.getActiveStepLabels();
      active.reduce((chain, stage) => {
        return chain.then(
          () =>
            new Promise<void>((resolve, reject) => {
              const dtos = this.buildStageDtos(stage.index, this.savedContractId!);
              dtos
                .reduce((c, dto) => c.then(() => this.saveStageRow(dto)), Promise.resolve())
                .then(resolve)
                .catch(reject);
            }),
        );
      }, Promise.resolve());
    };

    if (!this.savedContractId) {
      this.saveMaster((contractId: number) => {
        this.savedContractId = contractId;
        saveAll();
      });
    } else {
      saveAll();
    }
  }

  private saveStage(stageId: number, contractId: number): void {
    const stageDtos = this.buildStageDtos(stageId, contractId);

    // Save all rows of the stage sequentially using reduce (avoids nested subscribes)
    stageDtos
      .reduce((chain, dto) => {
        return chain.then(() => this.saveStageRow(dto));
      }, Promise.resolve())
      .then(() => {
        this.stageSaveStatus.update((s) => ({ ...s, [stageId]: 'saved' }));
      })
      .catch(() => {
        this.stageSaveStatus.update((s) => ({ ...s, [stageId]: 'error' }));
      });
  }

  private saveStageRow(dto: ContractsStagesDtlDto): Promise<void> {
    return new Promise((resolve, reject) => {
      const opts = new ApiOptionsModel<ContractsStagesDtlDto>();
      opts.RequestType = RequestType.POST;
      opts.Repository = Repository.Contract;
      opts.EndPoint = EndPoints.AddUpdateContractStageAsync;
      opts.ParamObj = dto;

      this.restService.CallApi<ContractsStagesDtlDto, ContractsStagesDtlDto>(opts).subscribe({
        next: (res: any) => {
          if (res?.Code === 200) resolve();
          else reject(res);
        },
        error: (err: any) => reject(err),
      });
    });
  }

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value);
  }
}
