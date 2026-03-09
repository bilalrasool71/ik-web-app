import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CheckboxModule } from 'primeng/checkbox';

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
  loading = signal(false);
  router = inject(Router);
  fb = inject(FormBuilder);
  contractForm!: FormGroup;
  step = signal(0);

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
  }

  onStageChange(event: any) {
    if (event.checked) {
      this.stepPlus();
    } else {
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
      Knitting: this.fb.array([this.createKnittingGroup()]),
      Dyeing: this.fb.array([this.createDyeingFormGroup()]),
      Cutting: this.fb.array([this.createCuttingFormGroup()]),
    });
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
        this.createReqitemsYarn(),
        this.createReqitemsYarn(),
        this.createReqitemsYarn(),
      ]),
    });
  }
  get requiredItemsYarn(): FormArray {
    return this.contractForm.get('Yarn.Requireditems') as FormArray;
  }
  newItemsFieldYarn() {
    this.requiredItemsYarn.push(this.createReqitemsYarn());
  }
  removeItemsYarn(index: number) {
    this.requiredItemsYarn.removeAt(index);
  }

  createReqitemsYarn(): FormGroup {
    return this.fb.group({
      ItemName: ['', Validators.required],
      Qty: ['', Validators.required],
    });
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
    this.getInnerItemInputsCutting(cutIndex, colorIndex).push(this.createReqitemsYarn());
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
