import { CommonModule, NgClass } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { HttpClient, HttpParams } from '@angular/common/http';
import { IkgsContract } from '../../models/domain/contract.model';

@Component({
  selector: 'app-ikgs-contract-form',
  imports: [
    NgClass,
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
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
  };

  workOrderlist: string[] = [];
  showYarn: boolean = true;
  showKnitting: boolean = false;
  showDyeing: boolean = false;
  showcutting: boolean = false;
  activeKnittingRow: Record<number, number> = {};
  activeDyeingRow: Record<number, { cIdx: number; rIdx: number }> = {};
  activeCuttingRow: Record<number, { cIdx: number; rIdx: number }> = {};

  selectKnittingRow(knittingIndex: number, requiredItemIndex: number) {
    this.activeKnittingRow[knittingIndex] = requiredItemIndex;
  }
  selectDyeingRow(dyeIndex: number, colorIndex: number, itemIndex: number) {
    this.activeDyeingRow[dyeIndex] = { cIdx: colorIndex, rIdx: itemIndex };
  }
  selectCuttingRow(cutIndex: number, colorIndex: number, dataIndex: number) {
    this.activeCuttingRow[cutIndex] = { cIdx: colorIndex, rIdx: dataIndex };
  }

  ngOnInit(): void {
    this.forminit();
    this.step.set(0);
    this.getWorkOrdersList();
    this.contractForm.get('Yarn.Qty')?.valueChanges.subscribe(() => {
      this.contractForm.get('Knitting')?.updateValueAndValidity({ emitEvent: false });
      this.contractForm.get('Dyeing')?.updateValueAndValidity({ emitEvent: false });
      this.contractForm.get('Cutting')?.updateValueAndValidity({ emitEvent: false });
    });
  }

  forminit() {
    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      Stages: this.fb.group({
        YarnProcure: [true],
        Knitting: [false],
        Dyeing: [false],
        Cutting: [false],
      }),
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
        const yarnProcureActive = this.contractForm.get('Stages.YarnProcure')?.value;
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

  get Cutting(): FormArray {
    return this.contractForm.get('Cutting') as FormArray;
  }

  newCuttingGroup() {
    this.Cutting.push(this.createCuttingFormGroup());
  }

  removeCuttingGroup(index: number) {
    this.Cutting.removeAt(index);
  }

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

  getColorsGroupCutting(cutIndex: number): FormArray {
    return this.Cutting.at(cutIndex).get('ColorsGroup') as FormArray;
  }
  newColorsGroupCutting(cutIndex: number) {
    this.getColorsGroupCutting(cutIndex).push(this.createCuttingColorGroup());
  }
  removeColorsGroupCutting(cutIndex: number, colorIndex: number) {
    this.getColorsGroupCutting(cutIndex).removeAt(colorIndex);
  }

  getColorDataCutting(cutIndex: number, colorIndex: number): FormArray {
    return this.getColorsGroupCutting(cutIndex).at(colorIndex).get('ColorData') as FormArray;
  }
  newColorDataCutting(cutIndex: number, colorIndex: number) {
    this.getColorDataCutting(cutIndex, colorIndex).push(this.cuttingSizeColorQtyGroup());
  }
  removeColorDataCutting(cutIndex: number, colorIndex: number, dataIndex: number) {
    this.getColorDataCutting(cutIndex, colorIndex).removeAt(dataIndex);
  }

  getRequiredInputsCutting(cutIndex: number, colorIndex: number, dataIndex: number): FormArray {
    return this.getColorDataCutting(cutIndex, colorIndex)
      .at(dataIndex)
      .get('RequiredInputs') as FormArray;
  }
  newRequiredInputCutting(cutIndex: number, colorIndex: number, dataIndex: number) {
    this.getRequiredInputsCutting(cutIndex, colorIndex, dataIndex).push(this.createItemQtyGroup());
  }
  removeRequiredInputCutting(
    cutIndex: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
  ) {
    this.getRequiredInputsCutting(cutIndex, colorIndex, dataIndex).removeAt(reqIndex);
  }

  getInputItemsCutting(
    cutIndex: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
  ): FormArray {
    return this.getRequiredInputsCutting(cutIndex, colorIndex, dataIndex)
      .at(reqIndex)
      .get('InputItems') as FormArray;
  }
  newInputItemCutting(cutIndex: number, colorIndex: number, dataIndex: number, reqIndex: number) {
    this.getInputItemsCutting(cutIndex, colorIndex, dataIndex, reqIndex).push(
      this.createItemQtyGroup(),
    );
  }
  removeInputItemCutting(
    cutIndex: number,
    colorIndex: number,
    dataIndex: number,
    reqIndex: number,
    itemIndex: number,
  ) {
    this.getInputItemsCutting(cutIndex, colorIndex, dataIndex, reqIndex).removeAt(itemIndex);
  }

  // ==========================================
  // 2. SKIPPABLE NAVIGATION & DATA CLEARING
  // ==========================================

  updateVisibleStages() {
    const s = this.contractForm.value.Stages;
    this.showYarn = s.YarnProcure;
    this.showKnitting = s.Knitting;
    this.showDyeing = s.Dyeing;
    this.showcutting = s.Cutting;
  }

  // Triggered when the user clicks a stage checkbox
  onStageChange(event: any, stageName: string) {
    if (event.checked) {
      this.updateVisibleStages();
    } else {
      this.updateVisibleStages();

      this.clearStageData(stageName);

      const currentStep = this.step();
      const stageIndex = ['YarnProcure', 'Knitting', 'Dyeing', 'Cutting'].indexOf(stageName);

      if (currentStep === stageIndex) {
        this.stepToNearestActive();
      }
    }
  }

  // Wipes form arrays back to their default state when a section is deselected
  clearStageData(stageName: string) {
    if (stageName === 'YarnProcure') {
      this.contractForm.setControl('Yarn', this.CreateYarnformGroup());
      this.lockedStages['YarnProcurement'] = {};
    } else if (stageName === 'Knitting') {
      this.Knitting.clear();
      this.newKnittingGroup();
      this.lockedStages['Knitting'] = {};
    } else if (stageName === 'Dyeing') {
      this.Dyeing.clear();
      this.newDyeingGroup();
      this.lockedStages['Dyeing'] = {};
    } else if (stageName === 'Cutting') {
      this.Cutting.clear();
      this.newCuttingGroup();
      this.lockedStages['Cutting'] = {};
    }
  }

  stepPlus() {
    const currentStep = this.step();
    const s = this.contractForm.value.Stages;
    const isStageActive = [s.YarnProcure, s.Knitting, s.Dyeing, s.Cutting];

    for (let i = currentStep + 1; i <= 3; i++) {
      if (isStageActive[i]) {
        this.step.set(i);
        return;
      }
    }
  }

  // Looks for the previous available active stage when navigating backward
  stepMinus() {
    const currentStep = this.step();
    const s = this.contractForm.value.Stages;
    const isStageActive = [s.YarnProcure, s.Knitting, s.Dyeing, s.Cutting];

    for (let i = currentStep - 1; i >= 0; i--) {
      if (isStageActive[i]) {
        this.step.set(i);
        return;
      }
    }
  }

  stepToNearestActive() {
    const s = this.contractForm.value.Stages;
    const isStageActive = [s.YarnProcure, s.Knitting, s.Dyeing, s.Cutting];

    for (let i = this.step() - 1; i >= 0; i--) {
      if (isStageActive[i]) {
        this.step.set(i);
        return;
      }
    }
    // If no previous stages are active, try to fall forward
    for (let i = this.step() + 1; i <= 3; i++) {
      if (isStageActive[i]) {
        this.step.set(i);
        return;
      }
    }
    this.step.set(0);
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

  getWorkOrdersList() {
    this.http.get<string[]>(`https://localhost:3000/workorder/list`).subscribe({
      next: (res) => {
        this.workOrderlist = res;
      },
      error: (err) => {
        console.error('Error fetching work orders:', err);
      },
    });
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
          this.contractForm.patchValue({
            WorkOrder: res.WorkOrder,
            Stages: res.Stages,
          });
          this.updateVisibleStages();

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
}
