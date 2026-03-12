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
import { HttpClient, HttpParams } from '@angular/common/http';
import { IkgsContract } from '../../../models/domain/contract,model';

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
  lockedStages: Record<string, boolean> = {
    YarnProcurement: false,
    Knitting: false,
    Dyeing: false,
    Cutting: false,
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

  lockStages(stageName: 'YarnProcurement' | 'Knitting' | 'Dyeing' | 'Cutting') {
    if (stageName === 'YarnProcurement') {
      this.lockedStages['YarnProcurement'] = true;
      return;
    }
    if (stageName === 'Knitting') {
      this.lockedStages['Knitting'] = true;
      return;
    }
    if (stageName === 'Dyeing') {
      this.lockedStages['Dyeing'] = true;
      return;
    }
    if (stageName === 'Cutting') {
      this.lockedStages['Cutting'] = true;
      return;
    }
  }

  stepPlus() {
    if (this.step() === 3) return;
    this.step.set(this.step() + 1);
    if (this.step() === 1) {
      this.showKnitting = true;
    }
    if (this.step() === 2) {
      this.showDyeing = true;
    }
    if (this.step() === 3) {
      this.showcutting = true;
    }
  }
  stepMinus() {
    if (this.step() === 0) return;
    this.step.set(this.step() - 1);
    if (this.step() < 3) this.showcutting = false;
    if (this.step() < 2) this.showDyeing = false;
    if (this.step() < 1) this.showKnitting = false;
  }

  onStageChange(event: any, stageName: string) {
    const stageControl = this.contractForm.get(stageName);

    if (event.checked) {
      stageControl?.enable();

      if (stageName === 'Knitting') this.showKnitting = true;
      if (stageName === 'Dyeing') this.showDyeing = true;
      if (stageName === 'Cutting') this.showcutting = true;

      this.stepPlus();
    } else {
      stageControl?.disable();

      if (stageName === 'Knitting') this.showKnitting = false;
      if (stageName === 'Dyeing') this.showDyeing = false;
      if (stageName === 'Cutting') this.showcutting = false;

      this.stepMinus();
    }
  }

  forminit() {
    this.contractForm = this.fb.group({
      WorkOrder: [null, Validators.required],
      stages: this.fb.group({
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
        const yarnProcureActive = this.contractForm.get('stages.YarnProcure')?.value;
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
      RequiredInputs: this.fb.array([this.createRequiredItemsGroupCutting()]),
    });
  }

  createRequiredItemsGroupCutting() {
    return this.fb.group({
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
      InputItems: this.fb.array([this.createCuttingInputGroup()]),
    });
  }
  createCuttingInputGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
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
    this.getRequiredInputsCutting(cutIndex, colorIndex, dataIndex).push(
      this.createRequiredItemsGroupCutting(),
    );
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
      this.createCuttingInputGroup(),
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

  filterWorkOrder() {
    const searchTerm = this.contractForm.value.WorkOrder.toLowerCase() || '';

    const filteredList = this.workOrderlist.filter((item) =>
      item.toLowerCase().includes(searchTerm),
    );
    this.workOrderlist = filteredList;
  }

  patchValues(query: any) {
    const workOrder = query.value.toLowerCase();

    const params = new HttpParams().append('WorkOrder', workOrder);
    this.http
      .get<IkgsContract>('https://localhost:3000/contract/getcontract', { params })
      .subscribe({
        next: (res) => {
          this.maxKnittingQty =
            res.Knitting?.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;
          this.maxDyeingQty =
            res.Dyeing?.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;
          this.maxCuttingQty =
            res.Cutting?.reduce((sum: number, item: any) => sum + Number(item.Qty || 0), 0) || 0;

          this.contractForm.patchValue({
            WorkOrder: res.WorkOrder,
            stages: res.stages,
          });

          // 3. PATCH YARN
          if (res.Yarn) {
            this.requiredItemsYarn.clear();

            res.Yarn.Requireditems?.forEach(() =>
              this.requiredItemsYarn.push(this.createItemQtyGroup()),
            );
            this.contractForm.get('Yarn')?.patchValue(res.Yarn);
          }

          // 4. PATCH KNITTING
          if (res.Knitting && Array.isArray(res.Knitting)) {
            this.Knitting.clear();
            res.Knitting.forEach((kStage: any) => {
              const group = this.createKnittingGroup();

              const req = group.get('RequiredItems') as FormArray;
              req.clear();
              kStage.RequiredItems?.forEach(() => req.push(this.createItemQtyGroup()));

              const inp = group.get('InputItems') as FormArray;
              inp.clear();
              kStage.InputItems?.forEach(() => inp.push(this.createItemQtyGroup()));

              group.patchValue(kStage);
              this.Knitting.push(group);
            });

            this.contractForm.get('Knitting')?.updateValueAndValidity();
          }

          // 5. PATCH DYEING
          if (res.Dyeing && Array.isArray(res.Dyeing)) {
            this.Dyeing.clear();
            res.Dyeing.forEach((dStage: any) => {
              const group = this.createDyeingFormGroup();

              const colorInputs = group.get('ColorInputs') as FormArray;
              colorInputs.clear();
              dStage.ColorInputs?.forEach((c: any) => {
                const cGroup = this.createColorInputsGroup();
                const inner = cGroup.get('ItemInputs') as FormArray;
                inner.clear();
                c.ItemInputs?.forEach(() => inner.push(this.createItemQtyGroup()));
                cGroup.patchValue(c);
                colorInputs.push(cGroup);
              });

              const itemsInput = group.get('ItemsInput') as FormArray;
              itemsInput.clear();
              dStage.ItemsInput?.forEach(() => itemsInput.push(this.createItemQtyGroup()));

              group.patchValue(dStage);
              this.Dyeing.push(group);
            });
            this.contractForm.get('Dyeing')?.updateValueAndValidity();
          }

          // 6. PATCH CUTTING
          if (res.Cutting && Array.isArray(res.Cutting)) {
            this.Cutting.clear();
            res.Cutting.forEach((cStage: any) => {
              const group = this.createCuttingFormGroup();

              const colorInputs = group.get('ColorInputs') as FormArray;
              colorInputs.clear();
              cStage.ColorInputs?.forEach((ci: any) => {
                const ciGroup = this.createCuttingColorGroup();
                const items = ciGroup.get('ItemsInputs') as FormArray;
                items.clear();
                ci.ItemsInputs?.forEach(() => items.push(this.cuttingSizeColorQtyGroup()));
                ciGroup.patchValue(ci);
                colorInputs.push(ciGroup);
              });

              const inputItems = group.get('InputItems') as FormArray;
              inputItems.clear();
              cStage.InputItems?.forEach((ii: any) => {
                const iiGroup = this.createColorInputsGroup();
                const items = iiGroup.get('ItemsInputs') as FormArray;
                items.clear();
                ii.ItemsInputs?.forEach(() => items.push(this.createItemQtyGroup()));
                iiGroup.patchValue(ii);
                inputItems.push(iiGroup);
              });

              group.patchValue(cStage);
              this.Cutting.push(group);
            });

            this.contractForm.get('Cutting')?.updateValueAndValidity();
          }
        },
        error: (err) => {
          console.log(err.error);
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
}
