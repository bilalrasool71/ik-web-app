import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IkgsContract } from '../../models/domain/contract.model';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel } from '../../core/models/api.model';

@Component({
  selector: 'app-ikgs-contract-form',
  imports: [
    NgClass,
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    SelectButtonModule,
    MultiSelectModule,
    CheckboxModule,
    InputTextModule,
    ButtonModule,
    DatePickerModule,
    FloatLabelModule,
  ],
  templateUrl: './ikgs-contract-form.html',
  styleUrl: './ikgs-contract-form.scss',
})
export class IkgsContractForm implements OnInit {
  messageService = inject(MessageService);
  restService = inject(IkgsRest);
  http = inject(HttpClient);
  loading = signal(false);
  router = inject(Router);
  fb = inject(FormBuilder);
  contractForm!: FormGroup;
  step = signal(0);
  maxKnittingQty: number = 0;
  maxDyeingQty: number = 0;
  maxCuttingQty: number = 0;
  lockedStages: Record<string, Record<number, boolean>> = {
    YarnProcurement: {},
    Knitting: {},
    Dyeing: {},
    Cutting: {},
    Sewing: {},
    Laundry: {},
    GarmentPrinting: {},
    GarmentEmbroidery: {},
    PannelEmbroidery: {},
    GarmentFinishing: {},
    GarmentPacking: {},
    Shipment: {},
  };

  workOrderlist: string[] = [];

  activeKnittingRow: Record<number, number> = {};
  activeDyeingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeCuttingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeSewingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeLaundryRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeGarmentPrintingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeGarmentEmbroideryRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activePannelEmbroideryRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeGarmentFinishingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeGarmentPackingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeShipmentRow: Record<number, { cIdx: number; rIdx: number }> = {};

  previousSelectedStages: string[] = [];

  selectKnittingRow(knittingIndex: number, requiredItemIndex: number) {
    this.activeKnittingRow[knittingIndex] = requiredItemIndex;
  }
  selectDyeingRow(dyeIndex: number, colorIndex: number, itemIndex: number) {
    this.activeDyeingRow[dyeIndex] = { cIdx: colorIndex, rIdx: itemIndex };
  }
  selectCuttingRow(cutIndex: number, colorIndex: number, dataIndex: number) {
    this.activeCuttingRow[cutIndex] = { cIdx: colorIndex, rIdx: dataIndex };
  }
  selectSewingRow(idx: number, cIdx: number, rIdx: number) { this.activeSewingRow[idx] = { cIdx, rIdx }; }
  selectLaundryRow(idx: number, cIdx: number, rIdx: number) { this.activeLaundryRow[idx] = { cIdx, rIdx }; }
  selectGarmentPrintingRow(idx: number, cIdx: number, rIdx: number) { this.activeGarmentPrintingRow[idx] = { cIdx, rIdx }; }
  selectGarmentEmbroideryRow(idx: number, cIdx: number, rIdx: number) { this.activeGarmentEmbroideryRow[idx] = { cIdx, rIdx }; }
  selectPannelEmbroideryRow(idx: number, cIdx: number, rIdx: number) { this.activePannelEmbroideryRow[idx] = { cIdx, rIdx }; }
  selectGarmentFinishingRow(idx: number, cIdx: number, rIdx: number) { this.activeGarmentFinishingRow[idx] = { cIdx, rIdx }; }
  selectGarmentPackingRow(idx: number, cIdx: number, rIdx: number) { this.activeGarmentPackingRow[idx] = { cIdx, rIdx }; }
  selectShipmentRow(idx: number, cIdx: number, rIdx: number) { this.activeShipmentRow[idx] = { cIdx, rIdx }; }

  ngOnInit(): void {
    this.forminit();
    this.step.set(0);
    this.getAllWoShortAsync();
    this.getOrderStagesShortAsync();
    this.contractForm.get('Yarn.Qty')?.valueChanges.subscribe(() => {
      this.contractForm.get('Knitting')?.updateValueAndValidity({ emitEvent: false });
      this.contractForm.get('Dyeing')?.updateValueAndValidity({ emitEvent: false });
      this.contractForm.get('Cutting')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  forminit() {
    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: [[]],
      Yarn: this.CreateYarnformGroup(),
      Knitting: this.fb.array([this.createKnittingGroup()], {
        validators: this.maxArrayQtyValidator(() => this.maxKnittingQty),
      }),
      Dyeing: this.fb.array([this.createDyeingFormGroup()], {
        validators: this.maxArrayQtyValidator(() => this.maxDyeingQty),
      }),
      Cutting: this.fb.array([this.createCuttingFormGroup()], {
        validators: this.maxArrayQtyValidator(() => this.maxCuttingQty),
      }),
      Sewing: this.fb.array([this.createCuttingFormGroup()]),
      Laundry: this.fb.array([this.createCuttingFormGroup()]),
      GarmentPrinting: this.fb.array([this.createCuttingFormGroup()]),
      GarmentEmbroidery: this.fb.array([this.createCuttingFormGroup()]),
      PannelEmbroidery: this.fb.array([this.createCuttingFormGroup()]),
      GarmentFinishing: this.fb.array([this.createCuttingFormGroup()]),
      GarmentPacking: this.fb.array([this.createCuttingFormGroup()]),
      Shipment: this.fb.array([this.createCuttingFormGroup()]),
    });
  }



  //  VALIDATOR
  // ==========================================
  maxArrayQtyValidator(getMaxQty: () => number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!(control instanceof FormArray)) return null;

      let currentTotal = 0;
      for (let i = 0; i < control.controls.length; i++) {
        currentTotal += Number(control.at(i).get('Qty')?.value || 0);
      }

      if (currentTotal === 0) return null;

      const backendMax = getMaxQty();
      if (backendMax > 0 && currentTotal > backendMax) {
        return {
          maxQtyExceeded: { max: backendMax, actual: currentTotal, reason: 'backend limit' },
        };
      }

      if (this.contractForm) {
        const selectedStages = this.contractForm.get('Stages')?.value || [];
        const yarnProcureActive = selectedStages.includes('0');
        const yarnQty = Number(this.contractForm.get('Yarn.Qty')?.value || 0);

        if (yarnProcureActive && currentTotal > yarnQty) {
          return { maxQtyExceeded: { max: yarnQty, actual: currentTotal, reason: 'yarn limit' } };
        }
      }

      return null;
    };
  }

  get Knitting(): FormArray {
    return this.contractForm.get('Knitting') as FormArray;
  }
  newKnittingGroup() {
    this.Knitting.push(this.createKnittingGroup());
  }
  removeKnittingGroup(index: number) {
    this.Knitting.removeAt(index);
  }

  get Dyeing(): FormArray {
    return this.contractForm.get('Dyeing') as FormArray;
  }

  newDyeingGroup() {
    this.Dyeing.push(this.createDyeingFormGroup());
  }
  removeDyeingGroup(index: number) {
    this.Dyeing.removeAt(index);
  }

  get Cutting(): FormArray { return this.contractForm.get('Cutting') as FormArray; }
  get Sewing(): FormArray { return this.contractForm.get('Sewing') as FormArray; }
  get Laundry(): FormArray { return this.contractForm.get('Laundry') as FormArray; }
  get GarmentPrinting(): FormArray { return this.contractForm.get('GarmentPrinting') as FormArray; }
  get GarmentEmbroidery(): FormArray { return this.contractForm.get('GarmentEmbroidery') as FormArray; }
  get PannelEmbroidery(): FormArray { return this.contractForm.get('PannelEmbroidery') as FormArray; }
  get GarmentFinishing(): FormArray { return this.contractForm.get('GarmentFinishing') as FormArray; }
  get GarmentPacking(): FormArray { return this.contractForm.get('GarmentPacking') as FormArray; }
  get Shipment(): FormArray { return this.contractForm.get('Shipment') as FormArray; }

  newCuttingGroup() { this.Cutting.push(this.createCuttingFormGroup()); }
  removeCuttingGroup(index: number) { this.Cutting.removeAt(index); }

  newSewingGroup() { this.Sewing.push(this.createCuttingFormGroup()); }
  removeSewingGroup(index: number) { this.Sewing.removeAt(index); }

  newLaundryGroup() { this.Laundry.push(this.createCuttingFormGroup()); }
  removeLaundryGroup(index: number) { this.Laundry.removeAt(index); }

  newGarmentPrintingGroup() { this.GarmentPrinting.push(this.createCuttingFormGroup()); }
  removeGarmentPrintingGroup(index: number) { this.GarmentPrinting.removeAt(index); }

  newGarmentEmbroideryGroup() { this.GarmentEmbroidery.push(this.createCuttingFormGroup()); }
  removeGarmentEmbroideryGroup(index: number) { this.GarmentEmbroidery.removeAt(index); }

  newPannelEmbroideryGroup() { this.PannelEmbroidery.push(this.createCuttingFormGroup()); }
  removePannelEmbroideryGroup(index: number) { this.PannelEmbroidery.removeAt(index); }

  newGarmentFinishingGroup() { this.GarmentFinishing.push(this.createCuttingFormGroup()); }
  removeGarmentFinishingGroup(index: number) { this.GarmentFinishing.removeAt(index); }

  newGarmentPackingGroup() { this.GarmentPacking.push(this.createCuttingFormGroup()); }
  removeGarmentPackingGroup(index: number) { this.GarmentPacking.removeAt(index); }

  newShipmentGroup() { this.Shipment.push(this.createCuttingFormGroup()); }
  removeShipmentGroup(index: number) { this.Shipment.removeAt(index); }

  createKnittingGroup(): FormGroup {
    return this.fb.group({
      Party: ['', Validators.required],
      Qty: ['', Validators.required],
      UOM: ['', Validators.required],
      FromDate: [null],
      ToDate: [null],
      InputItems: this.fb.array([
        this.createReqiredItemGroupKnitting(),
        this.createReqiredItemGroupKnitting(),
        this.createReqiredItemGroupKnitting(),
      ]),
    });
  }
  createReqiredItemGroupKnitting() {
    return this.fb.group({
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
      RequiredInputs: this.fb.array([this.createItemQtyGroup()]),
    });
  }

  getRequiredItemsKnitting(index: number): FormArray {
    return this.Knitting.at(index).get('InputItems') as FormArray;
  }
  newReqItemsKnitting(index: number) {
    this.getRequiredItemsKnitting(index).push(this.createReqiredItemGroupKnitting());
  }
  removeReqItemsKnitting(parentInd: number, index: number) {
    this.getRequiredItemsKnitting(parentInd).removeAt(index);
  }

  getRequiredInputItemsKnitting(knittingIndex: number, reqIndex: number): FormArray {
    return this.getRequiredItemsKnitting(knittingIndex)
      .at(reqIndex)
      .get('RequiredInputs') as FormArray;
  }

  newInputItemsKnitting(knittingIndex: number, reqIndex: number) {
    this.getRequiredInputItemsKnitting(knittingIndex, reqIndex).push(this.createItemQtyGroup());
  }

  removeInputItemsKnitting(knittingIndex: number, reqIndex: number, itemIndex: number) {
    this.getRequiredInputItemsKnitting(knittingIndex, reqIndex).removeAt(itemIndex);
  }

  // shared
  createItemQtyGroup(): FormGroup {
    return this.fb.group({
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
    });
  }

  CreateYarnformGroup(): FormGroup {
    return this.fb.group({
      Party: ['', Validators.required],
      Qty: ['', Validators.required],
      UOM: ['', Validators.required],
      FromDate: [null],
      ToDate: [null],
      Requireditems: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
    });
  }
  get requiredItemsYarn(): FormArray {
    return this.contractForm.get('Yarn.Requireditems') as FormArray;
  }
  newItemsFieldYarn() {
    this.requiredItemsYarn.push(this.createItemQtyGroup());
  }
  removeItemsYarn(index: number) {
    this.requiredItemsYarn.removeAt(index);
  }

  createDyeingFormGroup(): FormGroup {
    return this.fb.group({
      Party: ['', Validators.required],
      Qty: ['', Validators.required],
      UOM: ['', Validators.required],
      FromDate: [null],
      ToDate: [null],
      ColorInputs: this.fb.array([this.createColorInputsGroup()]),
    });
  }

  createColorInputsGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ItemInputs: this.fb.array([
        this.createRequiredItemsGroupDyeing(),
        this.createRequiredItemsGroupDyeing(),
        this.createRequiredItemsGroupDyeing(),
      ]),
    });
  }

  createRequiredItemsGroupDyeing() {
    return this.fb.group({
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
      RequiredInputs: this.fb.array([this.createItemQtyGroup()]),
    });
  }
  getColorInputsDyeing(index: number): FormArray {
    return this.Dyeing.at(index).get('ColorInputs') as FormArray;
  }

  newColorInputsDyeing(index: number) {
    this.getColorInputsDyeing(index).push(this.createColorInputsGroup());
  }
  removeColorInputsDyeing(parentInd: number, index: number) {
    this.getColorInputsDyeing(parentInd).removeAt(index);
  }

  getItemInputsDyeing(dyeIndex: number, colorIndex: number): FormArray {
    return this.getColorInputsDyeing(dyeIndex).at(colorIndex).get('ItemInputs') as FormArray;
  }
  newItemInputDyeing(dyeIndex: number, colorIndex: number) {
    this.getItemInputsDyeing(dyeIndex, colorIndex).push(this.createRequiredItemsGroupDyeing());
  }
  removeItemInputDyeing(dyeIndex: number, colorIndex: number, itemIndex: number) {
    this.getItemInputsDyeing(dyeIndex, colorIndex).removeAt(itemIndex);
  }

  getRequiredInputsDyeing(dyeIndex: number, colorIndex: number, itemIndex: number): FormArray {
    return this.getItemInputsDyeing(dyeIndex, colorIndex)
      .at(itemIndex)
      .get('RequiredInputs') as FormArray;
  }
  newRequiredInputDyeing(dyeIndex: number, colorIndex: number, itemIndex: number) {
    this.getRequiredInputsDyeing(dyeIndex, colorIndex, itemIndex).push(this.createItemQtyGroup());
  }
  removeRequiredInputDyeing(
    dyeIndex: number,
    colorIndex: number,
    itemIndex: number,
    reqIndex: number,
  ) {
    this.getRequiredInputsDyeing(dyeIndex, colorIndex, itemIndex).removeAt(reqIndex);
  }

  // cutting section

  createCuttingFormGroup(): FormGroup {
    return this.fb.group({
      Party: ['', Validators.required],
      Qty: ['', Validators.required],
      UOM: ['', Validators.required],
      FromDate: [null],
      ToDate: [null],
      ColorsGroup: this.fb.array([this.createCuttingColorGroup()]),
    });
  }

  createCuttingColorGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ColorData: this.fb.array([
        this.cuttingSizeColorQtyGroup(),
        this.cuttingSizeColorQtyGroup(),
        this.cuttingSizeColorQtyGroup(),
      ]),
    });
  }
  cuttingSizeColorQtyGroup(): FormGroup {
    return this.fb.group({
      Size: ['', Validators.required],
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
      RequiredInputs: this.fb.array([this.createItemQtyGroup()]),
    });
  }

  // Generic section for template-based stages (Cutting to Shipment)

  getColorsGroup(stageName: string, stageIdx: number): FormArray {
    return (this.contractForm.get(stageName) as FormArray).at(stageIdx).get('ColorsGroup') as FormArray;
  }
  newColorsGroup(stageName: string, stageIdx: number) {
    this.getColorsGroup(stageName, stageIdx).push(this.createCuttingColorGroup());
  }
  removeColorsGroup(stageName: string, stageIdx: number, colorIndex: number) {
    this.getColorsGroup(stageName, stageIdx).removeAt(colorIndex);
  }

  getColorData(stageName: string, stageIdx: number, colorIndex: number): FormArray {
    return this.getColorsGroup(stageName, stageIdx).at(colorIndex).get('ColorData') as FormArray;
  }
  newColorData(stageName: string, stageIdx: number, colorIndex: number) {
    this.getColorData(stageName, stageIdx, colorIndex).push(this.cuttingSizeColorQtyGroup());
  }
  removeColorData(stageName: string, stageIdx: number, colorIndex: number, dataIndex: number) {
    this.getColorData(stageName, stageIdx, colorIndex).removeAt(dataIndex);
  }

  getRequiredInputs(stageName: string, stageIdx: number, colorIndex: number, dataIndex: number): FormArray {
    return this.getColorData(stageName, stageIdx, colorIndex)
      .at(dataIndex)
      .get('RequiredInputs') as FormArray;
  }
  newRequiredInput(stageName: string, stageIdx: number, colorIndex: number, dataIndex: number) {
    this.getRequiredInputs(stageName, stageIdx, colorIndex, dataIndex).push(this.createItemQtyGroup());
  }
  removeRequiredInput(
    stageName: string,
    stageIdx: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
  ) {
    this.getRequiredInputs(stageName, stageIdx, colorIndex, dataIndex).removeAt(reqIndex);
  }

  getInputItems(
    stageName: string,
    stageIdx: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
  ): FormArray {
    return this.getRequiredInputs(stageName, stageIdx, colorIndex, dataIndex)
      .at(reqIndex)
      .get('InputItems') as FormArray;
  }
  newInputItem(stageName: string, stageIdx: number, colorIndex: number, dataIndex: number, reqIndex: number) {
    this.getInputItems(stageName, stageIdx, colorIndex, dataIndex, reqIndex).push(
      this.createItemQtyGroup(),
    );
  }
  removeInputItem(
    stageName: string,
    stageIdx: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
    itemIndex: number,
  ) {
    this.getInputItems(stageName, stageIdx, colorIndex, dataIndex, reqIndex).removeAt(itemIndex);
  }

  // ==========================================
  // 2. SKIPPABLE NAVIGATION & DATA CLEARING
  // ==========================================


  // Make sure previousSelectedStages is typed consistently

  partiesByStage: Record<string, any[]> = {}; // explicitly typed object keyed by stageId

  onStageChange(selectedStages: string[]) {    
     this.allParties.set([]);
    const removedStages = this.previousSelectedStages.filter(s => !selectedStages.includes(s));
    removedStages.forEach(stageId => {
      this.clearStageData(stageId);
      delete this.partiesByStage[stageId];
    });    
    const addedStages = selectedStages.filter(s => !this.previousSelectedStages.includes(s));
    addedStages.forEach(stageId => {
      this.getAllPartiesByStageIdAsync(stageId);        
    });    
    this.previousSelectedStages = [...selectedStages];    
    const activeStepLabels = this.getActiveStepLabels();
    if (!activeStepLabels.some(s => s.index === this.step())) {
      this.stepToNearestActive();
    }
  }

  // Wipes form arrays back to their default state when a section is deselected
  clearStageData(stageId: string) {
    const config: Record<string, { control: string; lockKey: string; isArray: boolean; factory: () => any }> = {
      '0': { control: 'Yarn', lockKey: 'YarnProcurement', isArray: false, factory: () => this.CreateYarnformGroup() },
      '1': { control: 'Knitting', lockKey: 'Knitting', isArray: true, factory: () => this.createKnittingGroup() },
      '2': { control: 'Dyeing', lockKey: 'Dyeing', isArray: true, factory: () => this.createDyeingFormGroup() },
      '3': { control: 'Cutting', lockKey: 'Cutting', isArray: true, factory: () => this.createCuttingFormGroup() },
      '4': { control: 'Sewing', lockKey: 'Sewing', isArray: true, factory: () => this.createCuttingFormGroup() },
      '5': { control: 'Laundry', lockKey: 'Laundry', isArray: true, factory: () => this.createCuttingFormGroup() },
      '6': { control: 'GarmentPrinting', lockKey: 'GarmentPrinting', isArray: true, factory: () => this.createCuttingFormGroup() },
      '7': { control: 'GarmentEmbroidery', lockKey: 'GarmentEmbroidery', isArray: true, factory: () => this.createCuttingFormGroup() },
      '8': { control: 'PannelEmbroidery', lockKey: 'PannelEmbroidery', isArray: true, factory: () => this.createCuttingFormGroup() },
      '9': { control: 'GarmentFinishing', lockKey: 'GarmentFinishing', isArray: true, factory: () => this.createCuttingFormGroup() },
      '10': { control: 'GarmentPacking', lockKey: 'GarmentPacking', isArray: true, factory: () => this.createCuttingFormGroup() },
      '11': { control: 'Shipment', lockKey: 'Shipment', isArray: true, factory: () => this.createCuttingFormGroup() },
    };

    const stage = config[stageId];
    if (!stage) return;

    if (stage.isArray) {
      const array = this.contractForm.get(stage.control) as FormArray;
      array.clear();
      array.push(stage.factory());
    } else {
      this.contractForm.setControl(stage.control, stage.factory());
    }

    if (this.lockedStages[stage.lockKey]) {
      this.lockedStages[stage.lockKey] = {};
    }
  }

  stepPlus() {
    const currentStep = this.step();
    const activeLabels = this.getActiveStepLabels();
    const currentIdx = activeLabels.findIndex(s => s.index === currentStep);

    if (currentIdx !== -1 && currentIdx < activeLabels.length - 1) {
      this.step.set(activeLabels[currentIdx + 1].index);
    }
  }

  // Looks for the previous available active stage when navigating backward
  stepMinus() {
    const currentStep = this.step();
    const activeLabels = this.getActiveStepLabels();
    const currentIdx = activeLabels.findIndex(s => s.index === currentStep);

    if (currentIdx > 0) {
      this.step.set(activeLabels[currentIdx - 1].index);
    }
  }

  stepToNearestActive() {
    const activeLabels = this.getActiveStepLabels();
    if (activeLabels.length > 0) {
      // Find nearest active step (prefer previous, then first)
      const nearest = activeLabels.reverse().find(s => s.index < this.step()) || activeLabels[0];
      this.step.set(nearest.index);
    } else {
      this.step.set(0);
    }
  }

  /** Returns the list of active step objects for the stepper indicator */
  getActiveStepLabels(): { index: number; label: string }[] {
    const selected = this.contractForm?.get('Stages')?.value || [];
    const allStages = this.allContarctStages() || [];

    return allStages
      .filter(s => selected.includes(s.value))
      .map(s => ({
        index: Number(s.value),
        label: s.viewValue
      }))
      .sort((a, b) => a.index - b.index);
  }

  /** Check if current step is the last active step */
  isLastActiveStep(): boolean {
    const active = this.getActiveStepLabels();
    return active.length === 0 || active[active.length - 1].index === this.step();
  }

  /** Check if current step is the first active step */
  isFirstActiveStep(): boolean {
    const active = this.getActiveStepLabels();
    return active.length === 0 || active[0].index === this.step();
  }

  lockStages(stageName: string, index: number = 0) {
    if (!this.lockedStages[stageName]) {
      this.lockedStages[stageName] = {};
    }
    this.lockedStages[stageName][index] = true;
  }

  isLocked(stageName: string, index: number = 0): boolean {
    return !!this.lockedStages[stageName]?.[index];
  }



  patchValues(query: string) {
    if (!query) return;

    const workOrder = query.toLowerCase();
    const exactMatchExists = this.workOrderlist.some(
      (wo) => wo.toLowerCase().trim() === workOrder.trim(),
    );
    if (!exactMatchExists) return;

    const params = new HttpParams().append('WorkOrder', workOrder);
    this.http
      .get<IkgsContract>('https://localhost:3000/contract/getcontract', { params })
      .subscribe({
        next: (res: any) => {
          this.maxKnittingQty =
            res.Knitting.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;
          this.maxDyeingQty =
            res.Dyeing.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;
          this.maxCuttingQty =
            res.Cutting.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;

          // 2. Patch Root Info & Active Stages
          let patchedStages = res.Stages || [];

          this.contractForm.patchValue({
            WorkOrder: res.WorkOrder,
            Stages: patchedStages
          });
          this.previousSelectedStages = [...patchedStages];

          // 3. PATCH YARN (1 Level Deep)
          if (res.Yarn) {
            this.requiredItemsYarn.clear();
            res.Yarn.Requireditems?.forEach(() => {
              this.requiredItemsYarn.push(this.createItemQtyGroup());
            });
            this.contractForm.get('Yarn')?.patchValue(res.Yarn);
          }

          // 4. PATCH KNITTING (2 Levels Deep)
          if (res.Knitting && Array.isArray(res.Knitting)) {
            this.Knitting.clear();

            res.Knitting.forEach((kStage: any) => {
              const group = this.createKnittingGroup();

              const inputItemsArray = group.get('InputItems') as FormArray;
              inputItemsArray.clear();

              kStage.InputItems?.forEach((inputItem: any) => {
                const iGroup = this.createReqiredItemGroupKnitting();
                const reqInputsArray = iGroup.get('RequiredInputs') as FormArray;
                reqInputsArray.clear();

                inputItem.RequiredInputs?.forEach((reqInput: any) => {
                  const rGroup = this.createItemQtyGroup();
                  rGroup.patchValue(reqInput);
                  reqInputsArray.push(rGroup);
                });

                iGroup.patchValue(inputItem);
                inputItemsArray.push(iGroup);
              });

              group.patchValue(kStage);
              this.Knitting.push(group);
            });
            this.contractForm.get('Knitting')?.updateValueAndValidity();
          }

          // 5. PATCH DYEING (3 Levels Deep)
          if (res.Dyeing && Array.isArray(res.Dyeing)) {
            this.Dyeing.clear();

            res.Dyeing.forEach((dStage: any) => {
              const group = this.createDyeingFormGroup();

              const colorInputsArray = group.get('ColorInputs') as FormArray;
              colorInputsArray.clear();

              dStage.ColorInputs?.forEach((colorInput: any) => {
                const cGroup = this.createColorInputsGroup();
                const itemInputsArray = cGroup.get('ItemInputs') as FormArray;
                itemInputsArray.clear();

                colorInput.ItemInputs?.forEach((itemInput: any) => {
                  const iGroup = this.createRequiredItemsGroupDyeing();
                  const reqInputsArray = iGroup.get('RequiredInputs') as FormArray;
                  reqInputsArray.clear();

                  itemInput.RequiredInputs?.forEach((reqInput: any) => {
                    const rGroup = this.createItemQtyGroup();
                    rGroup.patchValue(reqInput);
                    reqInputsArray.push(rGroup);
                  });

                  iGroup.patchValue(itemInput);
                  itemInputsArray.push(iGroup);
                });

                cGroup.patchValue(colorInput);
                colorInputsArray.push(cGroup);
              });

              group.patchValue(dStage);
              this.Dyeing.push(group);
            });
            this.contractForm.get('Dyeing')?.updateValueAndValidity();
          }

          // 6. PATCH CUTTING (3 Levels Deep)
          if (res.Cutting && Array.isArray(res.Cutting)) {
            this.Cutting.clear();

            res.Cutting.forEach((cStage: any) => {
              const group = this.createCuttingFormGroup();
              const colorsGroupArray = group.get('ColorsGroup') as FormArray;
              colorsGroupArray.clear();
              cStage.ColorsGroup?.forEach((colorGroup: any) => {
                const cGroup = this.createCuttingColorGroup();
                const colorDataArray = cGroup.get('ColorData') as FormArray;
                colorDataArray.clear();
                colorGroup.ColorData?.forEach((colorData: any) => {
                  const dGroup = this.cuttingSizeColorQtyGroup();
                  const reqInputsArray = dGroup.get('RequiredInputs') as FormArray;
                  reqInputsArray.clear();
                  colorData.RequiredInputs?.forEach((reqInput: any) => {
                    const rGroup = this.createItemQtyGroup();
                    rGroup.patchValue(reqInput);
                    reqInputsArray.push(rGroup);
                  });
                  dGroup.patchValue(colorData);
                  colorDataArray.push(dGroup);
                });
                cGroup.patchValue(colorGroup);
                colorsGroupArray.push(cGroup);
              });
              group.patchValue(cStage);
              this.Cutting.push(group);
            });
            this.contractForm.get('Cutting')?.updateValueAndValidity();
          }

          // 7-14. PATCH STAGES 4-11 (Generic Template Pattern)
          const stagesToPatch = [
            { name: 'Sewing', data: res.Sewing, array: this.Sewing },
            { name: 'Laundry', data: res.Laundry, array: this.Laundry },
            { name: 'GarmentPrinting', data: res.GarmentPrinting, array: this.GarmentPrinting },
            { name: 'GarmentEmbroidery', data: res.GarmentEmbroidery, array: this.GarmentEmbroidery },
            { name: 'PannelEmbroidery', data: res.PannelEmbroidery, array: this.PannelEmbroidery },
            { name: 'GarmentFinishing', data: res.GarmentFinishing, array: this.GarmentFinishing },
            { name: 'GarmentPacking', data: res.GarmentPacking, array: this.GarmentPacking },
            { name: 'Shipment', data: res.Shipment, array: this.Shipment },
          ];

          stagesToPatch.forEach(stage => {
            if (stage.data && Array.isArray(stage.data)) {
              stage.array.clear();
              stage.data.forEach((sData: any) => {
                const group = this.createCuttingFormGroup();
                const colorsGroupArray = group.get('ColorsGroup') as FormArray;
                colorsGroupArray.clear();
                sData.ColorsGroup?.forEach((cg: any) => {
                  const cGroup = this.createCuttingColorGroup();
                  const colorDataArray = cGroup.get('ColorData') as FormArray;
                  colorDataArray.clear();
                  cg.ColorData?.forEach((cd: any) => {
                    const dGroup = this.cuttingSizeColorQtyGroup();
                    const reqInputs = dGroup.get('RequiredInputs') as FormArray;
                    reqInputs.clear();
                    cd.RequiredInputs?.forEach((ri: any) => {
                      const rGroup = this.createItemQtyGroup();
                      rGroup.patchValue(ri);
                      reqInputs.push(rGroup);
                    });
                    dGroup.patchValue(cd);
                    colorDataArray.push(dGroup);
                  });
                  cGroup.patchValue(cg);
                  colorsGroupArray.push(cGroup);
                });
                group.patchValue(sData);
                stage.array.push(group);
              });
              this.contractForm.get(stage.name)?.updateValueAndValidity();
            }
          });
        },
        error: (err) => {
          console.error('Error fetching contract data:', err.error || err);
        },
      });
  }

  onSubmit() {
    console.log(this.contractForm.value);
  }

  findInvalidControls() {
    const invalid = [];
    const controls = this.contractForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
        console.log(`Invalid Form Section: ${name}`, controls[name].errors, controls[name].value);
      }
    }
    return invalid;
  }

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }


  allContarctStages: WritableSignal<SelectionValueModel[]> = signal([]);
  allWos: WritableSignal<SelectionValueModel[]> = signal([]);
  allParties: WritableSignal<SelectionValueModel[]> = signal([]);

  getAllWoShortAsync() {
    this.allWos.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Contract;
    authApiOpts.EndPoint = EndPoints.GetAllWoShortAsync;
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: any) => {
        if (result?.Code === 200 && result.Data) {
          this.allWos.set(result.Data);
        }
      });
  }

  getOrderStagesShortAsync() {
    this.allContarctStages.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Contract;
    authApiOpts.EndPoint = EndPoints.GetOrderStagesShortAsync;
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: any) => {
        if (result?.Code === 200 && result.Data) {
          console.log(result.Data)
          this.allContarctStages.set(result.Data);
        }
      });
  }

  getAllPartiesByStageIdAsync(stageId: string) {    
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Contract;
    authApiOpts.EndPoint = EndPoints.GetAllPartiesByStageIdAsync;
    authApiOpts.ReqQueryParams = [
      {
        Key: 'stageId',
        Value: stageId,
        IsDate: false
      }
    ]
    this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: any) => {
        if (result?.Code === 200 && result.Data) {
          this.allParties.set(result.Data);
        }
      });
  }
}
