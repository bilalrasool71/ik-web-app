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

  /** Tracks per-stage save status: key = stage_Id, value = 'saving' | 'saved' | 'error' */
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

    this.isEditMode = !!this.contractId;
    // If edit mode, load after LOVs settle (slight defer so LOVs are ready)
    if (this.isEditMode) {
      this.isEdit();
    }
  }

  // ── Edit Mode: Load & Populate ────────────────────────────
  isEdit(): void {
    if (this.contractId) {
      this.loadContractForEdit(this.contractId);
    }
  }

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
          this.contractId = res.Data.data.contract_Id;
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
    const stage_Ids = data.stagesList?.map((s) => s.stage_Id.toString()) || [];
    this.contractForm.patchValue({ Stages: stage_Ids });
    this.previousSelectedStages = [...stage_Ids];

    // 3. Load LOV data for each stage
    stage_Ids?.forEach((id) => this.loadStageData(+id, data.wo ?? null));

    // 4. Populate each stage form section
    data.stagesList?.forEach((stage) => {
      this.populateStageForm(stage, data.wo ?? null);
    });
  }

  populateStageForm(stage: ContractsStagesDto, wo: number | null | undefined): void {
    const stage_Id = stage.stage_Id;

    if (stage_Id === 0) {
      // Yarn — single entry, use first row
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
      // Yarn items (materials)
      const yarnArray = this.yarnItems;
      yarnArray.clear();
      const mats = row.materialsList?.length ? row.materialsList : [{ item_Id: null, qty: null }];
      mats.forEach((m) => {
        yarnArray.push(
          this.fb.group({
            material_Id: [m.item_Id ?? 0],
            qty: [(m as any).qty ?? 0],
            material_RowId: [(m as ContractsMaterialsDto).material_RowId ?? 0],
          }),
        );
      });
      // Store stage_RowId on the yarnStage group for save mapping
      (this.yarnStage as any)['_stage_RowId'] = row.stage_RowId;
    } else if (stage_Id === 1) {
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
          party_Id: row.party_Id != null ? row.party_Id.toString() : null,
          qty: row.req_Qty ?? 0,
          uom_Id: row.uom != null ? row.uom.toString() : null,
          fromDate: row.plan_SDat ? row.plan_SDat.split('T')[0] : null,
          toDate: row.plan_EDat ? row.plan_EDat.split('T')[0] : null,
          stage_RowId: row.stage_RowId ?? 0,
        });
        // Required materials
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();
        const reqMats = row.materialsList?.length
          ? row.materialsList
          : [{ item_Id: 0, qty: 0, Material_RowId: 0 }];
        reqMats.forEach((m) =>
          reqArr.push(
            this.fb.group({
              material_Id: [m.item_Id ?? 0],
              qty: [(m as any).qty ?? 0],
              material_RowId: [(m as ContractsMaterialsDto).material_RowId ?? 0],
            }),
          ),
        );
        arr.push(entry);
      });
    } else if (stage_Id === 2) {
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

  // ── Work Order Change ─────────────────────────────────────

  handleWorkOrderChange(wo: number) {
    if (!this.isEditMode) {
      // Only reset in new mode; in edit mode data is pre-loaded
      this.allPartiesByStage.set({});
      this.allMaterialsByStage.set({});
      this.resetStageForms();
    }
    const stages = this.contractForm.get('Stages')?.value || [];
    stages.forEach((stage_Id: number) => this.loadStageData(stage_Id, wo));
  }

  resetStageForms() {
    this.contractForm.patchValue({ yarnStage: this.createYarnEntry().value });
    this.contractForm.setControl('knittingStage', this.fb.array([this.createKnittingEntry()]));
    this.contractForm.setControl('dyeingStage', this.fb.array([this.createDyeingEntry()]));
    this.contractForm.setControl('cuttingStage', this.fb.array([this.createCuttingEntry()]));
  }

  loadStageData(stage_Id: number, wo: number | null | undefined) {
    if (wo)
      if (!this.allMaterialsByStage()[stage_Id]) this.getAllItemsBystage_IdAsync(wo, stage_Id);
    if (!this.allPartiesByStage()[stage_Id]) this.getAllPartiesBystage_IdAsync(stage_Id);
  }

  // ── Stepper ───────────────────────────────────────────────

  onStageChange(selectedStages: string[]) {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const newStages = selectedStages.filter((s) => !this.previousSelectedStages.includes(s));
    newStages.forEach((stage_Id) => {
      if (wo) this.loadStageData(+stage_Id, wo);
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

  // ── Save: Master First, Then Stage ───────────────────────

  /**
   * Called when the user clicks "Save" on any stage step.
   * - If no contractId yet → saves master first, then the stage.
   * - If contractId exists → saves the stage directly.
   */
  saveCurrentStage(): void {
    const stage_Id = this.step();
    this.stageSaveStatus.update((s) => ({ ...s, [stage_Id]: 'saving' }));

    if (!this.contractId) {
      // Save master first, then save stage in callback
      this.saveMaster((contractId: number) => {
        this.contractId = contractId;
        this.saveStage(stage_Id, contractId);
      });
    } else {
      this.saveStage(stage_Id, this.contractId);
    }
  }

  private saveMaster(onSuccess: (contractId: number) => void): void {
    const masterDto: ContractsMasterDto = {
      contract_Id: this.contractId ?? 0,
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
          const stage_Id = this.step();
          this.stageSaveStatus.update((s) => ({ ...s, [stage_Id]: 'error' }));
        }
      },
      error: () => {
        const stage_Id = this.step();
        this.stageSaveStatus.update((s) => ({ ...s, [stage_Id]: 'error' }));
      },
    });
  }

  // ── DTO Builders ──────────────────────────────────────────

  /**
   * Converts the current form state for a given stage_Id into
   * an array of ContractsStagesDtlDto (one per row) ready for the API.
   */
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
      qty: m.qty ?? 0,
      is_Active: 'Y',
    }));

    return [
      {
        contract_Id: contractId,
        stage_Id: stage_Id,
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
      const materials: ContractsMaterialsDto[] = (v.required || []).map((m: any) => ({
        material_RowId: m.material_RowId ?? 0,
        item_Id: m.material_Id ?? 0,
        qty: m.qty ?? 0,
        is_Active: 'Y',
      }));
      return {
        contract_Id: contractId,
        stage_Id: stage_Id,
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
        stage_Id: stage_Id,
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
        stage_Id: stage_Id,
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

  // ── Stage Save Status Helpers ─────────────────────────────

  getStageSaveStatus(stage_Id: number): 'saving' | 'saved' | 'error' | null {
    return this.stageSaveStatus()[stage_Id] ?? 0;
  }

  isStageSaving(stage_Id: number): boolean {
    return this.stageSaveStatus()[stage_Id] === 'saving';
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

  getKnittingRequired(ri: number): FormArray {
    return this.knittingStage.at(ri).get('required') as FormArray;
  }
  getKnittingInput(ri: number): FormArray {
    return this.knittingStage.at(ri).get('input') as FormArray;
  }
  addKnittingRequired(ri: number) {
    this.getKnittingRequired(ri).push(this.createMaterialItem());
  }
  addKnittingInput(ri: number) {
    this.getKnittingInput(ri).push(this.createMaterialItem());
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
  addDyeingColorItem(ri: number, ci: number) {
    this.getDyeingColorItems(ri, ci).push(this.createMaterialItem());
  }
  addDyeingInput(ri: number) {
    this.getDyeingInput(ri).push(this.createMaterialItem());
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
  addCuttingSize(ri: number, ci: number) {
    this.getCuttingRequiredSizes(ri, ci).push(this.createSizeItemGroup());
  }
  addCuttingSizeItem(ri: number, ci: number, si: number) {
    this.getCuttingRequiredSizeItems(ri, ci, si).push(this.createMaterialItem());
  }
  addCuttingInputColor(ri: number) {
    this.getCuttingInput(ri).push(this.createColorItemGroup());
  }
  addCuttingInputItem(ri: number, ci: number) {
    this.getCuttingInputItems(ri, ci).push(this.createMaterialItem());
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

  getPartiesByStage(stage_Id: number): SelectionValueModel[] {
    return this.allPartiesByStage()[stage_Id] || [];
  }

  getAllPartiesBystage_IdAsync(stage_Id: number) {
    const opts = new ApiOptionsModel<SelectionValueModel[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllPartiesByStageIdAsync;
    opts.ReqQueryParams = [{ Key: 'stage_Id', Value: stage_Id, IsDate: false }];
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

  getMaterialItemsByStage(stage_Id: number): GetWoItemsDto[] {
    return this.allMaterialsByStage()[stage_Id] || [];
  }

  getAllItemsBystage_IdAsync(wo: number, stage_Id: number) {
    const opts = new ApiOptionsModel<GetWoItemsDto[]>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.GetAllItemsByStageIdAsync;
    opts.ReqQueryParams = [
      { Key: 'wo', Value: wo, IsDate: false },
      { Key: 'stage_Id', Value: stage_Id, IsDate: false },
    ];
    this.restService.CallApi<GetWoItemsDto[], GetWoItemsDto[]>(opts).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) {
        this.allMaterialsByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
      }
    });
  }

  //#region Save All (Master + Stages in sequence)
  onSubmit() {
    // Final submit: saves master + all active stages in sequence
    if (!this.contractForm.valid) return;

    const saveAll = () => {
      const active = this.getActiveStepLabels();

      // IMPORTANT: return the promise chain
      return active.reduce((chain, stage) => {
        return chain.then(() => {
          const dtos = this.buildStageDtos(stage.index, this.contractId!);

          // save each dto sequentially
          return dtos.reduce((c, dto) => c.then(() => this.saveStageRow(dto)), Promise.resolve());
        });
      }, Promise.resolve());
    };

    const afterSave = () => {
      this.isEditMode = !!this.contractId;

      if (this.isEditMode) {
        this.isEdit(); // ✅ runs AFTER all saves
      }
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

  private saveStage(stage_Id: number, contractId: number): void {
    const stageDtos = this.buildStageDtos(stage_Id, contractId);

    // Save all rows of the stage sequentially using reduce (avoids nested subscribes)
    stageDtos
      .reduce((chain, dto) => {
        return chain.then(() => this.saveStageRow(dto));
      }, Promise.resolve())
      .then(() => {
        this.stageSaveStatus.update((s) => ({ ...s, [stage_Id]: 'saved' }));
      })
      .catch(() => {
        this.stageSaveStatus.update((s) => ({ ...s, [stage_Id]: 'error' }));
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
  //#endregion

  //#region Delete functions
  // ── Delete: Stage Row (cascades to its materials in DB) ───
  removeStageRow(stageRowId: number, stageId: number, rowIndex: number): void {
    if (!stageRowId || stageRowId === 0) {
      this.removeStageRowFromForm(stageId, rowIndex);
      return;
    }
    const opts = new ApiOptionsModel<object>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.RemoveStageRowAsync;
    opts.ReqQueryParams = [{ Key: 'stage_RowId', Value: stageRowId, IsDate: false }];

    this.restService.CallApi<object, object>(opts).subscribe({
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

  // ── Delete: Single Material Item ──────────────────────────

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
    const opts = new ApiOptionsModel<object>();
    opts.RequestType = RequestType.GET;
    opts.Repository = Repository.Contract;
    opts.EndPoint = EndPoints.RemoveMaterialItemAsync;
    opts.ReqQueryParams = [{ Key: 'material_RowId', Value: materialRowId, IsDate: false }];

    this.restService.CallApi<object, object>(opts).subscribe({
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

  // ── Delete: Dyeing Color Group (all its items from DB) ────

  removeDyeingColorGroupWithDb(ri: number, ci: number): void {
    const items = this.getDyeingColorItems(ri, ci);
    const materialIds: number[] = items.controls
      .map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);

    if (materialIds.length === 0) {
      // No saved items — remove from form directly
      if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci);
      return;
    }

    // Delete all child materials sequentially then remove from form
    materialIds
      .reduce((chain, id) => {
        return chain.then(() => this.callRemoveMaterialApi(id));
      }, Promise.resolve())
      .then(() => {
        if (this.getDyeingRequired(ri).length > 1) this.getDyeingRequired(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove dyeing color group items'));
  }

  // ── Delete: Cutting Color Group (all sizes → items from DB)

  removeCuttingColorGroupWithDb(ri: number, ci: number): void {
    const sizes = this.getCuttingRequiredSizes(ri, ci);
    const materialIds: number[] = [];

    sizes.controls.forEach((sg) => {
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
      .reduce((chain, id) => {
        return chain.then(() => this.callRemoveMaterialApi(id));
      }, Promise.resolve())
      .then(() => {
        if (this.getCuttingRequired(ri).length > 1) this.getCuttingRequired(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove cutting color group items'));
  }

  // ── Delete: Cutting Size Group (all its items from DB) ────

  removeCuttingSizeWithDb(ri: number, ci: number, si: number): void {
    const items = this.getCuttingRequiredSizeItems(ri, ci, si);
    const materialIds: number[] = items.controls
      .map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);

    if (materialIds.length === 0) {
      if (this.getCuttingRequiredSizes(ri, ci).length > 1)
        this.getCuttingRequiredSizes(ri, ci).removeAt(si);
      return;
    }

    materialIds
      .reduce((chain, id) => {
        return chain.then(() => this.callRemoveMaterialApi(id));
      }, Promise.resolve())
      .then(() => {
        if (this.getCuttingRequiredSizes(ri, ci).length > 1)
          this.getCuttingRequiredSizes(ri, ci).removeAt(si);
      })
      .catch(() => console.error('Failed to remove cutting size items'));
  }

  // ── Delete: Cutting Input Color Group (all its items from DB)

  removeCuttingInputColorWithDb(ri: number, ci: number): void {
    const items = this.getCuttingInputItems(ri, ci);
    const materialIds: number[] = items.controls
      .map((c) => c.value.material_RowId)
      .filter((id) => id && id !== 0);

    if (materialIds.length === 0) {
      if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci);
      return;
    }

    materialIds
      .reduce((chain, id) => {
        return chain.then(() => this.callRemoveMaterialApi(id));
      }, Promise.resolve())
      .then(() => {
        if (this.getCuttingInput(ri).length > 1) this.getCuttingInput(ri).removeAt(ci);
      })
      .catch(() => console.error('Failed to remove cutting input color items'));
  }

  // ── Cutting Size Item & Input Item ────────────────────────

  removeCuttingSizeItemWithDb(ri: number, ci: number, si: number, ii: number): void {
    const item = this.getCuttingRequiredSizeItems(ri, ci, si).at(ii);
    const materialRowId = item.value.material_RowId;

    if (!materialRowId || materialRowId === 0) {
      if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1)
        this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii);
      return;
    }

    this.callRemoveMaterialApi(materialRowId)
      .then(() => {
        if (this.getCuttingRequiredSizeItems(ri, ci, si).length > 1)
          this.getCuttingRequiredSizeItems(ri, ci, si).removeAt(ii);
      })
      .catch(() => console.error('Failed to remove cutting size item'));
  }

  removeCuttingInputItemWithDb(ri: number, ci: number, ii: number): void {
    const item = this.getCuttingInputItems(ri, ci).at(ii);
    const materialRowId = item.value.material_RowId;

    if (!materialRowId || materialRowId === 0) {
      if (this.getCuttingInputItems(ri, ci).length > 1)
        this.getCuttingInputItems(ri, ci).removeAt(ii);
      return;
    }

    this.callRemoveMaterialApi(materialRowId)
      .then(() => {
        if (this.getCuttingInputItems(ri, ci).length > 1)
          this.getCuttingInputItems(ri, ci).removeAt(ii);
      })
      .catch(() => console.error('Failed to remove cutting input item'));
  }

  removeKnittingInputItemWithDb(ri: number, ii: number): void {
    const item = this.getKnittingInput(ri).at(ii);
    const materialRowId = item.value.material_RowId;

    if (!materialRowId || materialRowId === 0) {
      if (this.getKnittingInput(ri).length > 1) this.getKnittingInput(ri).removeAt(ii);
      return;
    }

    this.callRemoveMaterialApi(materialRowId)
      .then(() => {
        if (this.getKnittingInput(ri).length > 1) this.getKnittingInput(ri).removeAt(ii);
      })
      .catch(() => console.error('Failed to remove knitting input item'));
  }
  // ── Shared API caller (returns Promise) ───────────────────

  private callRemoveMaterialApi(materialRowId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const opts = new ApiOptionsModel<object>();
      opts.RequestType = RequestType.GET;
      opts.Repository = Repository.Contract;
      opts.EndPoint = EndPoints.RemoveMaterialItemAsync;
      opts.ReqQueryParams = [{ Key: 'material_RowId', Value: materialRowId, IsDate: false }];

      this.restService.CallApi<object, object>(opts).subscribe({
        next: (res: any) => (res === true ? resolve() : reject()),
        error: () => reject(),
      });
    });
  }
  //#endregion

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value);
  }
}
