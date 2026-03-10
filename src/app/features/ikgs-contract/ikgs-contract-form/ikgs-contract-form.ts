import { CommonModule } from '@angular/common';
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

  workOrderlist: string[] = [];

  showYarn: boolean = true;
  showKnitting: boolean = false;
  showDyeing: boolean = false;
  showcutting: boolean = false;

  ngOnInit(): void {
    this.forminit();
    this.step.set(0);
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
      WorKOrder: ['', Validators.required],
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
  maxArrayQtyValidator(getMaxQty: () => number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const max = getMaxQty();
      if (!max || !(control instanceof FormArray)) return null;

      let currentTotal = 0;
      for (let i = 0; i < control.controls.length; i++) {
        currentTotal += Number(control.at(i).get('Qty')?.value || 0);
      }

      if (currentTotal > max) {
        return { maxQtyExceeded: { max, actual: currentTotal } };
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
      RequiredItems: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
      InputItems: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
    });
  }

  getRequiredItemsKnitting(index: number): FormArray {
    return this.Knitting.at(index).get('RequiredItems') as FormArray;
  }
  newReqItemsKnitting(index: number) {
    this.getRequiredItemsKnitting(index).push(this.createItemQtyGroup());
  }
  removeReqItemsKnitting(parentInd: number, index: number) {
    this.getRequiredItemsKnitting(parentInd).removeAt(index);
  }

  getInputItemsKnitting(index: number): FormArray {
    return this.Knitting.at(index).get('InputItems') as FormArray;
  }

  newInputItemsKnitting(index: number) {
    this.getInputItemsKnitting(index).push(this.createItemQtyGroup());
  }
  removeInputItemsKnitting(parentInd: number, index: number) {
    this.getInputItemsKnitting(parentInd).removeAt(index);
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
      ToDAte: [null],
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

      ItemsInput: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
    });
  }

  createColorInputsGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ItemInputs: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
    });
  }

  getItemInputDyeing(index: number): FormArray {
    return this.Dyeing.at(index).get('ItemsInput') as FormArray;
  }
  newItemInputDyeing(index: number) {
    this.getItemInputDyeing(index).push(this.createItemQtyGroup());
  }

  removeItemInputDyeing(parentInd: number, index: number) {
    this.getItemInputDyeing(parentInd).removeAt(index);
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

  getInnerItemInputsDyeing(dyeIndex: number, colorIndex: number): FormArray {
    return this.getColorInputsDyeing(dyeIndex).at(colorIndex).get('ItemInputs') as FormArray;
  }

  newInnerItemInputsDyeing(dyeIndex: number, colorIndex: number) {
    this.getInnerItemInputsDyeing(dyeIndex, colorIndex).push(this.createItemQtyGroup());
  }
  removeInnerItemInputsDyeing(dyeIndex: number, colorIndex: number, index: number) {
    this.getInnerItemInputsDyeing(dyeIndex, colorIndex).removeAt(index);
  }

  createCuttingFormGroup(): FormGroup {
    return this.fb.group({
      Party: ['', Validators.required],
      Qty: ['', Validators.required],
      UOM: ['', Validators.required],
      FromDate: [null],
      ToDate: [null],
      ColorInputs: this.fb.array([this.createCuttingColorGroup()]),
      InputItems: this.fb.array([this.createInputItemsGroup()]),
    });
  }

  createCuttingColorGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ItemsInputs: this.fb.array([
        this.cuttingSizeColorQtyGroup(),
        this.cuttingSizeColorQtyGroup(),
        this.cuttingSizeColorQtyGroup(),
      ]),
    });
  }
  createInputItemsGroup(): FormGroup {
    return this.fb.group({
      Color: ['', Validators.required],
      ItemsInputs: this.fb.array([
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
        this.createItemQtyGroup(),
      ]),
    });
  }

  getItemInputsCutting(index: number): FormArray {
    return this.Cutting.at(index).get('InputItems') as FormArray;
  }
  newItemInputCutting(index: number) {
    this.getItemInputsCutting(index).push(this.createInputItemsGroup());
  }

  removeItemInputCutting(parentInd: number, index: number) {
    this.getItemInputsCutting(parentInd).removeAt(index);
  }

  getInnerItemInputsCutting(parentInd: number, itemInd: number): FormArray {
    return this.getItemInputsCutting(parentInd).at(itemInd).get('ItemsInputs') as FormArray;
  }
  newInnerItemInputsCutting(cutIndex: number, colorIndex: number) {
    this.getInnerItemInputsCutting(cutIndex, colorIndex).push(this.createItemQtyGroup());
  }
  removeInnerItemInputsCutting(cutIndex: number, colorIndex: number, index: number) {
    this.getInnerItemInputsCutting(cutIndex, colorIndex).removeAt(index);
  }

  getColorInputsCutting(index: number): FormArray {
    return this.Cutting.at(index).get('ColorInputs') as FormArray;
  }

  newColorInputsCutting(index: number) {
    this.getColorInputsCutting(index).push(this.createCuttingColorGroup());
  }
  removeColorInputsCutting(parentInd: number, index: number) {
    this.getColorInputsCutting(parentInd).removeAt(index);
  }

  getInnerColorInputsCutting(cutIndex: number, colorIndex: number): FormArray {
    return this.getColorInputsCutting(cutIndex).at(colorIndex).get('ItemsInputs') as FormArray;
  }

  newInnerColorInputsCutting(cutIndex: number, colorIndex: number) {
    this.getInnerColorInputsCutting(cutIndex, colorIndex).push(this.cuttingSizeColorQtyGroup());
  }
  removeInnerColorInputsCutting(cutIndex: number, colorIndex: number, index: number) {
    this.getInnerColorInputsCutting(cutIndex, colorIndex).removeAt(index);
  }

  cuttingSizeColorQtyGroup(): FormGroup {
    return this.fb.group({
      Size: ['', Validators.required],
      ItemName: ['', Validators.required],
      Qty: [0, [Validators.required, Validators.min(1)]],
    });
  }

  getWorkOrdersList() {
    const searchTerm = this.contractForm.value.WorkOrder.toLowerCase() || '';

    this.http.get<string[]>(`https://localhost:3000/workorder/list`).subscribe({
      next: (res) => {
        const filteredList = res.filter((item) => item.toLowerCase().includes(searchTerm));

        this.workOrderlist = filteredList;
      },
      error: (err) => {
        console.error('Error fetching work orders:', err);
      },
    });
  }

  patchValues() {
    const workOrder = this.contractForm.value.WorKOrder;

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

          this.contractForm.get('Knitting')?.updateValueAndValidity();
          this.contractForm.get('Dyeing')?.updateValueAndValidity();
          this.contractForm.get('Cutting')?.updateValueAndValidity();

          this.contractForm.patchValue({
            WorKOrder: res.WorKOrder,
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
                const iiGroup = this.createInputItemsGroup();
                const items = iiGroup.get('ItemsInputs') as FormArray;
                items.clear();
                ii.ItemsInputs?.forEach(() => items.push(this.createItemQtyGroup()));
                iiGroup.patchValue(ii);
                inputItems.push(iiGroup);
              });

              group.patchValue(cStage);
              this.Cutting.push(group);
            });
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
