import { Observable, tap } from 'rxjs';
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
  createDyeingRequiredItem,
  createDyeingInputItem,
  createCuttingEntry,
  createCuttingColorGroup,
  createCuttingSizeGroup,
  createCuttingRequiredItem,
  createCuttingInputColorGroup,
  createCuttingInputItem,
  createMaterialItem,
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
  allInputItemsByKnittingRow = signal<Record<number, GetWoItemsDto[]>>({});
  allDyeingItemsByColor = signal<Record<number, GetWoItemsDto[]>>({});
  hoveredRequiredIndex = signal<Record<number, number>>({});

  // ── Cutting Stage Signals ─────────────────────────────────────
  allCuttingColors = signal<GetWoItemsDto[]>([]);
  allCuttingSizesByColor = signal<Record<string, GetWoItemsDto[]>>({});
  allCuttingItemsByColorSize = signal<Record<string, GetWoItemsDto[]>>({});
  allCuttingInputItemsByColor = signal<Record<number, GetWoItemsDto[]>>({});
  hoveredCuttingColorIndex = signal<Record<number, number>>({});

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

  //#region Form Loading

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

  resetStageForms() {
    this.contractForm.patchValue({ yarnStage: createYarnEntry(this.fb).value });
    this.contractForm.setControl('knittingStage', this.fb.array([createKnittingEntry(this.fb)]));
    this.contractForm.setControl('dyeingStage', this.fb.array([createDyeingEntry(this.fb)]));
    this.contractForm.setControl('cuttingStage', this.fb.array([createCuttingEntry(this.fb)]));
  }

  populateFormFromApi(data: ContractsMasterDto): void {
    this.contractForm.patchValue({ WorkOrder: data.wo });

    const stage_Ids = data.stagesList?.map((s) => s.stage_Id.toString()) || [];
    this.contractForm.patchValue({ Stages: stage_Ids });
    this.previousSelectedStages = [...stage_Ids];

    stage_Ids?.forEach((id) => this.loadStageData(+id, data.wo ?? null, true, 0));
    if (stage_Ids.some((id) => +id >= 3) && data.wo) this.loadCuttingColorsAsync(data.wo);
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
              this.GetAllItemsByStageIdAsync(wo, 1, false, [reqMat.item_Id.toString()]).subscribe();
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
        });

        const colorMats = row.materialsList?.filter((m) => m.mat_Type === 'R') ?? [];
        const allInputMats = row.materialsList?.filter((m) => m.mat_Type === 'I') ?? [];
        const colorRowIds = new Set(colorMats.map((c) => c.material_RowId));
        const item1Mats = allInputMats.filter((m) => colorRowIds.has(m.parent_Mat_RowId ?? 0));
        const item1RowIds = new Set(item1Mats.map((m) => m.material_RowId));
        const item2Mats = allInputMats.filter((m) => item1RowIds.has(m.parent_Mat_RowId ?? 0));
        const reqArr = entry.get('required') as FormArray;
        reqArr.clear();

        if (colorMats.length) {
          colorMats.forEach((colorMat) => {
            const colorGroup = createDyeingRequiredItem(this.fb);
            colorGroup.patchValue({
              color_Id: colorMat.item_Id ?? 0,
              material_RowId: colorMat.material_RowId ?? 0,
            });

            if (wo && colorMat.item_Id)
              this.GetAllItemsByStageIdAsync(wo, 2, false, [
                colorMat.item_Id.toString(),
              ]).subscribe();

            const childItem1s = item1Mats.filter(
              (m) => m.parent_Mat_RowId === colorMat.material_RowId,
            );
            const inputArr = colorGroup.get('inputItems') as FormArray;
            inputArr.clear();

            if (childItem1s.length) {
              for (let index = 0; index < childItem1s.length; index++) {
                let inp1 = childItem1s[index++];
                let inp2 = childItem1s[index];
                const inpItem = createDyeingInputItem(this.fb);
                const item2 = item2Mats.find((m) => m.parent_Mat_RowId === inp1.material_RowId);
                inpItem.patchValue({
                  item1_Id: inp1.item_Id ?? 0,
                  item1_Qty: inp1.qty ?? 0,
                  material_RowId: inp1.material_RowId ?? 0,
                  item2_Id: inp2?.item_Id ?? 0,
                  item2_Qty: inp2?.qty ?? 0,
                  item2_material_RowId: item2?.material_RowId ?? 0,
                });
                inputArr.push(inpItem);
              }
            }

            reqArr.push(colorGroup);
          });
        } else {
          reqArr.push(createDyeingRequiredItem(this.fb));
        }
        arr.push(entry);
      });
    } else {
      this.populateCuttingStageForm(stage, wo);
    }
  }

  private populateCuttingStageForm(stage: ContractsStagesDto, wo: number | null | undefined): void {
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
      });

      const mats = row.materialsList || [];
      const colorMats = mats.filter((m) => m.mat_Type === 'C');
      const sizeMats = mats.filter((m) => m.mat_Type === 'S');
      const reqMats = mats.filter((m) => m.mat_Type === 'R');
      const inputColorMats = mats.filter((m) => m.mat_Type === 'IC');
      const inputItemMats = mats.filter((m) => m.mat_Type === 'I');

      const reqArr = entry.get('required') as FormArray;
      reqArr.clear();
      if (colorMats.length) {
        colorMats.forEach((colorMat) => {
          const colorGroup = createCuttingColorGroup(this.fb);
          colorGroup.patchValue({
            color_Id: colorMat.item_Id ?? 0,
            material_RowId: colorMat.material_RowId ?? 0,
          });
          if (wo && colorMat.item_Id) this.loadCuttingSizesByColorAsync(wo, colorMat.item_Id);

          const sizesArr = colorGroup.get('sizes') as FormArray;
          sizesArr.clear();
          const childSizes = sizeMats.filter((s) => s.parent_Mat_RowId === colorMat.material_RowId);
          if (childSizes.length) {
            childSizes.forEach((sizeMat) => {
              const sizeGroup = createCuttingSizeGroup(this.fb);
              sizeGroup.patchValue({
                size_Id: sizeMat.item_Id ?? 0,
                material_RowId: sizeMat.material_RowId ?? 0,
              });
              if (wo && colorMat.item_Id && sizeMat.item_Id)
                this.loadCuttingItemsByColorSizeAsync(wo, colorMat.item_Id, sizeMat.item_Id);

              const itemsArr = sizeGroup.get('items') as FormArray;
              itemsArr.clear();
              const childItems = reqMats.filter(
                (r) => r.parent_Mat_RowId === sizeMat.material_RowId,
              );
              if (childItems.length) {
                childItems.forEach((reqMat) => {
                  const itemGroup = createCuttingRequiredItem(this.fb);
                  itemGroup.patchValue({
                    material_Id: reqMat.item_Id ?? 0,
                    qty: reqMat.qty ?? 0,
                    material_RowId: reqMat.material_RowId ?? 0,
                  });
                  if (wo && colorMat.item_Id && sizeMat.item_Id && reqMat.item_Id)
                    this.loadCuttingInputItemsByParamsAsync(
                      wo,
                      colorMat.item_Id,
                      sizeMat.item_Id,
                      reqMat.item_Id,
                    );
                  itemsArr.push(itemGroup);
                });
              } else {
                itemsArr.push(createCuttingRequiredItem(this.fb));
              }
              sizesArr.push(sizeGroup);
            });
          } else {
            sizesArr.push(createCuttingSizeGroup(this.fb));
          }
          reqArr.push(colorGroup);
        });
      } else {
        reqArr.push(createCuttingColorGroup(this.fb));
      }

      const inputArr = entry.get('input') as FormArray;
      inputArr.clear();
      if (inputColorMats.length) {
        inputColorMats.forEach((inputColorMat) => {
          const inputColorGroup = createCuttingInputColorGroup(this.fb);
          inputColorGroup.patchValue({
            color_Id: inputColorMat.item_Id ?? 0,
            material_RowId: inputColorMat.material_RowId ?? 0,
          });
          const inputItemsArr = inputColorGroup.get('items') as FormArray;
          inputItemsArr.clear();
          const childInputItems = inputItemMats.filter(
            (i) => i.parent_Mat_RowId === inputColorMat.material_RowId,
          );
          if (childInputItems.length) {
            childInputItems.forEach((inputItemMat) => {
              const inputItemGroup = createCuttingInputItem(this.fb);
              inputItemGroup.patchValue({
                material_Id: inputItemMat.item_Id ?? 0,
                qty: inputItemMat.qty ?? 0,
                material_RowId: inputItemMat.material_RowId ?? 0,
              });
              inputItemsArr.push(inputItemGroup);
            });
          } else {
            inputItemsArr.push(createCuttingInputItem(this.fb));
          }
          inputArr.push(inputColorGroup);
        });
      } else {
        inputArr.push(createCuttingInputColorGroup(this.fb));
      }

      arr.push(entry);
    });
  }

  private updateFormAfterSave(saved: ContractsStagesDtlDto): void {
    const stageId = saved.stage_Id ?? 0;
    if (stageId >= 3) {
      this.updateCuttingFormAfterSave(saved);
      return;
    }
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

  private updateCuttingFormAfterSave(saved: ContractsStagesDtlDto): void {
    const rowIndex = this.cuttingStage.controls.findIndex(
      (c) => c.value.stage_RowId === saved.stage_RowId || c.value.stage_RowId === 0,
    );
    if (rowIndex === -1) return;
    this.cuttingStage.at(rowIndex).patchValue({ stage_RowId: saved.stage_RowId });

    const colorMats = saved.materialsList?.filter((m) => m.mat_Type === 'C') ?? [];
    const sizeMats = saved.materialsList?.filter((m) => m.mat_Type === 'S') ?? [];
    const reqMats = saved.materialsList?.filter((m) => m.mat_Type === 'R') ?? [];
    const inputColorMats = saved.materialsList?.filter((m) => m.mat_Type === 'IC') ?? [];
    const inputItemMats = saved.materialsList?.filter((m) => m.mat_Type === 'I') ?? [];

    this.getCuttingRequired(rowIndex).controls.forEach((colorCtrl, ci) => {
      const colorMat = colorMats[ci];
      if (colorMat) colorCtrl.patchValue({ material_RowId: colorMat.material_RowId ?? 0 });
      const childSizes = sizeMats.filter((s) => s.parent_Mat_RowId === colorMat?.material_RowId);
      this.getCuttingRequiredSizes(rowIndex, ci).controls.forEach((sizeCtrl, si) => {
        const sizeMat = childSizes[si];
        if (sizeMat) sizeCtrl.patchValue({ material_RowId: sizeMat.material_RowId ?? 0 });
        const childItems = reqMats.filter((r) => r.parent_Mat_RowId === sizeMat?.material_RowId);
        this.getCuttingRequiredSizeItems(rowIndex, ci, si).controls.forEach((itemCtrl, ii) => {
          if (childItems[ii])
            itemCtrl.patchValue({ material_RowId: childItems[ii].material_RowId ?? 0 });
        });
      });
    });

    this.getCuttingInput(rowIndex).controls.forEach((inputColorCtrl, ci) => {
      const inputColorMat = inputColorMats[ci];
      if (inputColorMat)
        inputColorCtrl.patchValue({ material_RowId: inputColorMat.material_RowId ?? 0 });
      const childInputItems = inputItemMats.filter(
        (i) => i.parent_Mat_RowId === inputColorMat?.material_RowId,
      );
      this.getCuttingInputItems(rowIndex, ci).controls.forEach((itemCtrl, ii) => {
        if (childInputItems[ii])
          itemCtrl.patchValue({ material_RowId: childInputItems[ii].material_RowId ?? 0 });
      });
    });
  }

  loadStageData(
    stage_Id: number,
    wo: number | null | undefined,
    isParent: boolean,
    parentId: number,
  ) {
    if (wo && !this.allMaterialsByStage()[stage_Id])
      this.GetAllItemsByStageIdAsync(wo, stage_Id, isParent, [parentId.toString()]).subscribe();
    if (!this.allPartiesByStage()[stage_Id]) this.getAllPartiesBystage_IdAsync(stage_Id);
  }

  //#endregion

  //#region Change Events

  handleWorkOrderChange(wo: number) {
    if (!this.isEditMode) {
      this.allPartiesByStage.set({});
      this.allMaterialsByStage.set({});
      this.allCuttingColors.set([]);
      this.allCuttingSizesByColor.set({});
      this.allCuttingItemsByColorSize.set({});
      this.allCuttingInputItemsByColor.set({});
      this.resetStageForms();
    }
    const stages = this.contractForm.get('Stages')?.value || [];
    stages.forEach((stage_Id: number) => this.loadStageData(+stage_Id, wo, true, 0));
    if (stages.includes('3') || stages.includes(3)) this.loadCuttingColorsAsync(wo);
  }

  onStageChange(selectedStages: string[]) {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const newStages = selectedStages.filter((s) => !this.previousSelectedStages.includes(s));
    newStages.forEach((stage_Id) => {
      if (wo) this.loadStageData(+stage_Id, wo, true, 0);
      if (+stage_Id === 3 && wo) this.loadCuttingColorsAsync(wo);
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
        [value.toString()],
      ).subscribe();
    }
  }

  onInputItemChange(value: any, ri: number, ii: number, iii: number): void {
    const items = this.getInputItemsByRequiredItem(ri, ii);
    const selected = items.find((m) => m.item2 === value);
    if (!selected) return;
    this.getKnittingInputItems(ri, ii)
      .at(iii)
      .patchValue({ item2_Qty: selected.item2_Qty ?? 0 });
  }

  onDyeingColorChange(ri: number, ci: number): void {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const colorId: number = this.getDyeingRequired(ri).at(ci).value.color_Id;
    if (!wo || !colorId) return;
    const inputArr = this.getDyeingInputItems(ri, ci);
    inputArr.clear();
    inputArr.push(createDyeingInputItem(this.fb));
    this.GetAllItemsByStageIdAsync(wo, 2, false, [colorId.toString()]).subscribe();
  }

  onDyeingItemChange(value: number, ri: number, ci: number, ii: number): void {
    const colorId = this.getDyeingRequired(ri).at(ci).value.color_Id;
    const items = this.allDyeingItemsByColor()[colorId] || [];
    const selected = items.find((m) => m.item1 === value);
    if (!selected) return;
    this.getDyeingInputItems(ri, ci)
      .at(ii)
      .patchValue({
        item1_Qty: selected.item1_Qty ?? 0,
        item2_Id: selected.item2 ?? 0,
        item2_Qty: selected.item2_Qty ?? 0,
      });
  }

  //#endregion

  //#region Stepper

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

  //#endregion

  //#region Hover Helpers (Knitting)

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

  //#endregion

  //#region Dropdown Helpers

  getPartiesByStage(stage_Id: number): SelectionValueModel[] {
    return this.allPartiesByStage()[stage_Id] || [];
  }

  getMaterialItemsByStage(stage_Id: number): GetWoItemsDto[] {
    return this.allMaterialsByStage()[stage_Id] || [];
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

  getColorRequiredItems(ri: number, ii: number): GetWoItemsDto[] {
    const selected = this.getDyeingRequired(ri)
      .controls.filter((_, idx) => idx !== ii)
      .map((c) => c.value.color_Id)
      .filter((id: number) => id && id !== 0);
    return this.getMaterialItemsByStage(2).filter((m) => !selected.includes(m.color1));
  }

  getDyeingAvailableItems(ri: number, ci: number, ii: number): GetWoItemsDto[] {
    const colorId = this.getDyeingRequired(ri).at(ci).value.color_Id;
    const allItems = this.allDyeingItemsByColor()[colorId] || [];
    const selected = this.getDyeingInputItems(ri, ci)
      .controls.filter((_, idx) => idx !== ii)
      .map((c) => (c as any).value.item1_Id)
      .filter((id: number) => id && id !== 0);
    return allItems.filter((m) => !selected.includes(m.item1));
  }

  //#endregion

  //#region Form Accessors

  get yarnStage(): FormGroup {
    return this.contractForm.get('yarnStage') as FormGroup;
  }

  get yarnItems(): FormArray {
    return this.yarnStage.get('yarnItems') as FormArray;
  }

  get knittingStage(): FormArray {
    return this.contractForm.get('knittingStage') as FormArray;
  }

  get dyeingStage(): FormArray {
    return this.contractForm.get('dyeingStage') as FormArray;
  }

  get cuttingStage(): FormArray {
    return this.contractForm.get('cuttingStage') as FormArray;
  }

  getKnittingRequired(ri: number): FormArray {
    return this.knittingStage.at(ri).get('required') as FormArray;
  }

  getKnittingInputItems(ri: number, ii: number): FormArray {
    return this.getKnittingRequired(ri).at(ii).get('inputItems') as FormArray;
  }

  getDyeingRequired(ri: number): FormArray {
    return this.dyeingStage.at(ri).get('required') as FormArray;
  }

  getDyeingInputItems(ri: number, ci: number): FormArray {
    return this.getDyeingRequired(ri).at(ci).get('inputItems') as FormArray;
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

  //#endregion

  //#region Add Rows / Items

  addYarnItem() {
    this.yarnItems.push(createMaterialItem(this.fb, 'fiber_Qty'));
  }

  addKnittingRow() {
    this.knittingStage.push(createKnittingEntry(this.fb));
  }

  addKnittingRequired(ri: number) {
    this.getKnittingRequired(ri).push(createKnittingRequiredItem(this.fb));
  }

  addKnittingInputItem(ri: number, ii: number) {
    this.getKnittingInputItems(ri, ii).push(createMaterialItem(this.fb, 'item2_Qty'));
  }

  addDyeingRow() {
    this.dyeingStage.push(createDyeingEntry(this.fb));
  }

  addDyeingColorGroup(ri: number) {
    this.getDyeingRequired(ri).push(createDyeingRequiredItem(this.fb));
  }

  addDyeingInputItem(ri: number, ci: number) {
    this.getDyeingInputItems(ri, ci).push(createDyeingInputItem(this.fb));
  }

  addCuttingRow() {
    this.cuttingStage.push(createCuttingEntry(this.fb));
  }

  addCuttingColorGroup(ri: number) {
    this.getCuttingRequired(ri).push(createCuttingColorGroup(this.fb));
    this.getCuttingInput(ri).push(createCuttingInputColorGroup(this.fb));
  }

  addCuttingSize(ri: number, ci: number) {
    this.getCuttingRequiredSizes(ri, ci).push(createCuttingSizeGroup(this.fb));
  }

  addCuttingSizeItem(ri: number, ci: number, si: number) {
    this.getCuttingRequiredSizeItems(ri, ci, si).push(createCuttingRequiredItem(this.fb));
  }

  addCuttingInputItem(ri: number, ci: number) {
    this.getCuttingInputItems(ri, ci).push(createCuttingInputItem(this.fb));
  }

  //#endregion

  //#region Delete

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
    if (stage_Ids.includes(3)) {
      this.allCuttingColors.set([]);
      this.allCuttingSizesByColor.set({});
      this.allCuttingItemsByColorSize.set({});
      this.allCuttingInputItemsByColor.set({});
    }
  }

  //#region Cutting LOV Loading

  loadCuttingColorsAsync(wo: number): void {
    if (this.allCuttingColors().length) return;
    this.contractFormService.GetAllItemsByStageIdAsync(wo, 3, true, []).subscribe((res: any) => {
      if (res?.Code === 200 && res.Data) this.allCuttingColors.set(res.Data);
    });
  }

  loadCuttingSizesByColorAsync(wo: number, colorId: number): void {
    const key = colorId.toString();
    if (this.allCuttingSizesByColor()[key]) return;
    this.contractFormService
      .GetAllItemsByStageIdAsync(wo, 3, false, [key])
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data)
          this.allCuttingSizesByColor.update((prev) => ({ ...prev, [key]: res.Data }));
      });
  }

  loadCuttingItemsByColorSizeAsync(wo: number, colorId: number, sizeId: number): void {
    const key = `${colorId}_${sizeId}`;
    if (this.allCuttingItemsByColorSize()[key]) return;
    this.contractFormService
      .GetAllItemsByStageIdAsync(wo, 3, false, [colorId.toString(), sizeId.toString()])
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data)
          this.allCuttingItemsByColorSize.update((prev) => ({ ...prev, [key]: res.Data }));
      });
  }

  loadCuttingInputItemsByParamsAsync(
    wo: number,
    colorId: number,
    sizeId: number,
    item1Id: number,
  ): void {
    this.contractFormService
      .GetAllItemsByStageIdAsync(wo, 3, false, [
        colorId.toString(),
        sizeId.toString(),
        item1Id.toString(),
      ])
      .subscribe((res: any) => {
        if (res?.Code === 200 && res.Data) {
          const incoming: GetWoItemsDto[] = res.Data;
          this.allCuttingInputItemsByColor.update((prev) => {
            const existing = prev[colorId] || [];
            const merged = [
              ...existing,
              ...incoming.filter((n) => !existing.some((e) => e.item2 === n.item2)),
            ];
            return { ...prev, [colorId]: merged };
          });
        }
      });
  }

  getCuttingColors(): GetWoItemsDto[] {
    return this.allCuttingColors();
  }

  getCuttingSizesByColor(colorId: number): GetWoItemsDto[] {
    return this.allCuttingSizesByColor()[colorId?.toString()] || [];
  }

  getCuttingItemsByColorSize(colorId: number, sizeId: number): GetWoItemsDto[] {
    return this.allCuttingItemsByColorSize()[`${colorId}_${sizeId}`] || [];
  }

  getCuttingInputItemsForColor(colorId: number): GetWoItemsDto[] {
    return this.allCuttingInputItemsByColor()[colorId] || [];
  }

  //#endregion

  //#region Cutting Change Handlers

  onCuttingColorChange(ri: number, ci: number, colorId: number): void {
    const wo = this.contractForm.get('WorkOrder')?.value;
    if (!colorId) return;

    // Reset sizes and items under this color group
    const sizesArr = this.getCuttingRequiredSizes(ri, ci);
    sizesArr.clear();
    sizesArr.push(createCuttingSizeGroup(this.fb));

    // Sync color to corresponding input group
    if (this.getCuttingInput(ri).at(ci)) {
      this.getCuttingInput(ri).at(ci).patchValue({ color_Id: colorId });
      const inputItemsArr = this.getCuttingInputItems(ri, ci);
      inputItemsArr.clear();
      inputItemsArr.push(createCuttingInputItem(this.fb));
    }

    if (wo) this.loadCuttingSizesByColorAsync(wo, colorId);
    this.setHoveredCuttingColor(ri, ci);
  }

  onCuttingSizeChange(ri: number, ci: number, si: number, sizeId: number): void {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const colorId: number = this.getCuttingRequired(ri).at(ci).value.color_Id;
    if (!colorId || !sizeId) return;

    // Reset items under this size group
    const itemsArr = this.getCuttingRequiredSizeItems(ri, ci, si);
    itemsArr.clear();
    itemsArr.push(createCuttingRequiredItem(this.fb));

    if (wo) this.loadCuttingItemsByColorSizeAsync(wo, colorId, sizeId);
  }

  onCuttingRequiredItemChange(
    ri: number,
    ci: number,
    si: number,
    ii: number,
    item1Id: number,
  ): void {
    const wo = this.contractForm.get('WorkOrder')?.value;
    const colorId: number = this.getCuttingRequired(ri).at(ci).value.color_Id;
    const sizeId: number = this.getCuttingRequiredSizes(ri, ci).at(si).value.size_Id;
    if (!wo || !colorId || !sizeId || !item1Id) return;

    // Auto-fill qty from loaded items
    const items = this.getCuttingItemsByColorSize(colorId, sizeId);
    const found = items.find((m) => m.item1 === item1Id);
    if (found)
      this.getCuttingRequiredSizeItems(ri, ci, si)
        .at(ii)
        .patchValue({ qty: found.item1_Qty ?? 0 });

    this.loadCuttingInputItemsByParamsAsync(wo, colorId, sizeId, item1Id);
  }
  onCuttingInputItemChange(ri: number, ci: number, ii: number, value: number): void {
    const colorId = this.getCuttingRequired(ri).at(ci).value.color_Id;
    if (!colorId) return;

    const items = this.getCuttingInputItemsForColor(colorId);
    const selected = items.find((m) => m.item2 === value);

    if (!selected) return;

    this.getCuttingInputItems(ri, ci)
      .at(ii)
      .patchValue({
        qty: selected.item2_Qty ?? 0,
      });
  }

  //#endregion

  //#region Cutting Hover Helpers

  setHoveredCuttingColor(ri: number, ci: number): void {
    this.hoveredCuttingColorIndex.update((prev) => ({ ...prev, [ri]: ci }));
  }

  getHoveredCuttingColor(ri: number): number {
    return this.hoveredCuttingColorIndex()[ri] ?? 0;
  }

  getHoveredCuttingColorId(ri: number): number {
    const ci = this.getHoveredCuttingColor(ri);
    return this.getCuttingRequired(ri).at(ci)?.value?.color_Id ?? 0;
  }

  getHoveredCuttingColorLabel(ri: number): string {
    const colorId = this.getHoveredCuttingColorId(ri);
    if (!colorId) return 'Input Items';
    return this.allCuttingColors().find((c) => c.color1 === colorId)?.colorDs1 ?? 'Input Items';
  }

  //#endregion

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
      const arr = this.getDyeingRequired(rowIndex);
      if (arr.length > 1) arr.removeAt(itemIndex);
    }
  }

  removeDyeingInputItemWithDb(ri: number, ci: number, ii: number): void {
    const arr = this.getDyeingInputItems(ri, ci);
    const materialRowId = arr.at(ii).value.material_RowId;
    if (!materialRowId || materialRowId === 0) {
      if (arr.length > 1) arr.removeAt(ii);
      return;
    }
    this.contractFormService
      .removeMaterialItemApi(materialRowId)
      .then(() => {
        if (arr.length > 1) arr.removeAt(ii);
      })
      .catch(() => console.error('Failed to remove dyeing input item'));
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

  removeDyeingColorGroupWithDb(ri: number, ci: number): void {
    const materialIds = this.getDyeingInputItems(ri, ci)
      .controls.map((c: any) => c.value.material_RowId)
      .filter((id: any) => id && id !== 0);
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
    const removeFromForm = () => {
      if (this.getCuttingRequired(ri).length > 1) {
        this.getCuttingRequired(ri).removeAt(ci);
        this.getCuttingInput(ri).removeAt(ci);
      }
    };
    if (materialIds.length === 0) {
      removeFromForm();
      return;
    }
    materialIds
      .reduce(
        (chain, id) => chain.then(() => this.contractFormService.removeMaterialItemApi(id)),
        Promise.resolve(),
      )
      .then(removeFromForm)
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

  //#endregion

  //#region Stage Save Status

  getStageSaveStatus(stage_Id: number): 'saving' | 'saved' | 'error' | null {
    return this.stageSaveStatus()[stage_Id] ?? 0;
  }

  isStageSaving(stage_Id: number): boolean {
    return this.stageSaveStatus()[stage_Id] === 'saving';
  }

  //#endregion

  //#region LOV Loading

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

  //#endregion

  //#region API Calls

  GetAllItemsByStageIdAsync(
    wo: number,
    stage_Id: number,
    isParent: boolean,
    param?: string[],
  ): Observable<any> {
    return this.contractFormService.GetAllItemsByStageIdAsync(wo, stage_Id, isParent, param).pipe(
      tap((res: any) => {
        if (res?.Code === 200 && res.Data) {
          if (stage_Id === 0 || stage_Id === 1) {
            if (isParent)
              this.allMaterialsByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
            else {
              let parentId = 0;
              if (param && param.length > 0) parentId = parseInt(param[0]);
              this.allInputItemsByKnittingRow.update((prev) => ({ ...prev, [parentId]: res.Data }));
            }
          } else if (stage_Id === 2) {
            if (isParent)
              this.allMaterialsByStage.update((prev) => ({ ...prev, [stage_Id]: res.Data }));
            else {
              let colorId = 0;
              if (param && param.length > 0) colorId = parseInt(param[0]);
              this.allDyeingItemsByColor.update((prev) => ({ ...prev, [colorId]: res.Data }));
            }
          }
        }
      }),
    );
  }

  //#endregion

  //#region DTO Builders

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
      const materials: ContractsMaterialsDto[] = [];
      (v.required || []).forEach((req: any) => {
        const colorMatRowId = req.material_RowId ?? 0;
        materials.push({
          material_RowId: colorMatRowId,
          item_Id: req.color_Id ?? 0,
          qty: 0,
          is_Active: 'Y',
          mat_Type: 'R',
          parent_Mat_RowId: 0,
        });
        (req.inputItems || []).forEach((inp: any) => {
          const item1RowId = inp.material_RowId ?? 0;
          materials.push({
            material_RowId: item1RowId,
            item_Id: inp.item1_Id ?? 0,
            qty: inp.item1_Qty ?? 0,
            is_Active: 'Y',
            mat_Type: 'I',
            parent_Mat_RowId: colorMatRowId,
          });
          materials.push({
            material_RowId: inp.item2_material_RowId ?? 0,
            item_Id: inp.item2_Id ?? 0,
            qty: inp.item2_Qty ?? 0,
            is_Active: 'Y',
            mat_Type: 'I',
            parent_Mat_RowId: item1RowId,
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

  private buildCuttingDtos(stage_Id: number, contractId: number): ContractsStagesDtlDto[] {
    return this.cuttingStage.controls.map((ctrl) => {
      const v = ctrl.value;
      const materials: ContractsMaterialsDto[] = [];

      let tempIdCounter = -1; // negative temp IDs for new records

      (v.required || []).forEach((colorGroup: any) => {
        // Use real DB id if exists, otherwise assign a unique temp negative id
        const colorTempId =
          colorGroup.material_RowId > 0 ? colorGroup.material_RowId : tempIdCounter--;

        materials.push({
          material_RowId: colorGroup.material_RowId ?? 0,
          item_Id: colorGroup.color_Id ?? 0,
          qty: 0,
          is_Active: 'Y',
          mat_Type: 'C',
          parent_Mat_RowId: 0,
          temp_Id: colorTempId, // ← new field
        });

        (colorGroup.sizes || []).forEach((sizeGroup: any) => {
          const sizeTempId =
            sizeGroup.material_RowId > 0 ? sizeGroup.material_RowId : tempIdCounter--;

          materials.push({
            material_RowId: sizeGroup.material_RowId ?? 0,
            item_Id: sizeGroup.size_Id ?? 0,
            qty: 0,
            is_Active: 'Y',
            mat_Type: 'S',
            parent_Mat_RowId:
              colorGroup.material_RowId > 0 ? colorGroup.material_RowId : colorTempId, // ← link to parent temp id
            temp_Id: sizeTempId,
          });

          (sizeGroup.items || []).forEach((item: any) => {
            materials.push({
              material_RowId: item.material_RowId ?? 0,
              item_Id: item.material_Id ?? 0,
              qty: item.qty ?? 0,
              is_Active: 'Y',
              mat_Type: 'R',
              parent_Mat_RowId:
                sizeGroup.material_RowId > 0 ? sizeGroup.material_RowId : sizeTempId, // ← link to parent temp id
            });
          });
        });
      });

      (v.input || []).forEach((colorGroup: any) => {
        const inputColorTempId =
          colorGroup.material_RowId > 0 ? colorGroup.material_RowId : tempIdCounter--;

        materials.push({
          material_RowId: colorGroup.material_RowId ?? 0,
          item_Id: colorGroup.color_Id ?? 0,
          qty: 0,
          is_Active: 'Y',
          mat_Type: 'IC',
          parent_Mat_RowId: 0,
          temp_Id: inputColorTempId,
        });

        (colorGroup.items || []).forEach((item: any) => {
          materials.push({
            material_RowId: item.material_RowId ?? 0,
            item_Id: item.material_Id ?? 0,
            qty: item.qty ?? 0,
            is_Active: 'Y',
            mat_Type: 'I',
            parent_Mat_RowId:
              colorGroup.material_RowId > 0 ? colorGroup.material_RowId : inputColorTempId, // ← link to parent temp id
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

  //#endregion

  //#region Save

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

  //#endregion

  //#region Navigation

  backArrowBtn(): void {
    this.router.navigate(['/ikgs/contract']);
  }

  patchValues(value: any) {
    console.log(value);
  }
}
