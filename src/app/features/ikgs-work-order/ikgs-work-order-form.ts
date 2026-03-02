import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { ApiOptionsModel, ApiResponseModel } from '../../core/models/api.model';
import { EndPoints, Repository, RequestType } from '../../core/enums/api.enum';
import { FloatLabelModule } from 'primeng/floatlabel';
import { WorkOrderDto } from '../../models/domain/work-order.model';


@Component({
  selector: 'app-ikgs-work-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule,
    InputTextModule, ButtonModule, DatePickerModule, FloatLabelModule],
  templateUrl: './ikgs-work-order-form.html',
  styleUrl: './ikgs-work-order-form.scss',
})
export class IkgsWorkOrderForm implements OnInit {

  restService = inject(IkgsRest);
  messageService = inject(MessageService);
  loading = signal(false);

  workOrderForm: FormGroup;
  isLocked: boolean = false;
  minDate!: Date;


  constructor(private fb: FormBuilder, private router: Router) {

    this.workOrderForm = this.fb.group({

      style_Id: [null, Validators.required],
      customer: [null, Validators.required],
      orderReceivingDate: [null, Validators.required],

      knitting_Waste: [null],
      Dyeing_Waste: [null],
      Cutting_Waste: [null],
      Printing_Waste: [null],
      Embroidery_Waste: [null],
      GWP_Laundry_Waste: [null],
      Sewing_Waste: [null],


      purchaseOrder: this.fb.array([this.createPurchaseOrderRow()]),

    })
  }


  createPurchaseOrderRow(): FormGroup {
    return this.fb.group({
      purchaseOrder: [null, Validators.required],
      color: [null, Validators.required],
      shipmentDate: [null, Validators.required],

      sizes: this.fb.array([this.createSizeRow()]),

    })
  }




  createSizeRow(): FormGroup {
    return this.fb.group({
      colorSize: [null, Validators.required],
      colorPieces: [null, Validators.required],


      color_knitting_Waste: [null, Validators.required],
      color_Dyeing_Waste: [null, Validators.required],
      color_Cutting_Waste: [null, Validators.required],
      color_Printing_Waste: [null, Validators.required],
      color_Embroidery_Waste: [null, Validators.required],
      color_GWP_Laundry_Waste: [null, Validators.required],
      color_Sewing_Waste: [null, Validators.required],

    });
  }



  getPurchaseOrderGroup(index: number): FormGroup {
    return this.purchaseOrderArray.at(index) as FormGroup;
  }

  getSizesArray(group: FormGroup): FormArray {
    return group.get('sizes') as FormArray;
  }




  addSize(group: FormGroup) {

    const newSize = this.createSizeRow();

    (group.get('sizes') as FormArray).push(newSize);

    const wasteFields: string[] = [
      'knitting_Waste',
      'Dyeing_Waste',
      'Cutting_Waste',
      'Printing_Waste',
      'Embroidery_Waste',
      'GWP_Laundry_Waste',
      'Sewing_Waste'
    ];

    wasteFields.forEach(field => {

      const mainValue = this.workOrderForm.get(field)?.value;
      const colorField = 'color_' + field;

      if (mainValue > 0) {
        newSize.get(colorField)?.setValue(mainValue, { emitEvent: false });
      }

    });

    this.setupColorToMainSync(newSize);

  }

  removeSize(group: FormGroup, index: number) {
    if (this.getSizesArray(group).length > 1) {
      this.getSizesArray(group).removeAt(index);
    }
  }


  isMainFieldsValid(index: number): boolean {
    const group = this.purchaseOrderArray.at(index) as FormGroup;
    return !!group.get('purchaseOrder')?.value &&
      !!group.get('color')?.value &&
      !!group.get('shipmentDate')?.value;
  }

  get purchaseOrderArray(): FormArray {
    return this.workOrderForm.get('purchaseOrder') as FormArray;
  }



  addPurchaseOrder(): void {

    const group = this.createPurchaseOrderRow();

    if (this.purchaseOrderArray.length > 0) {

      const firstRow = this.purchaseOrderArray.at(0) as FormGroup;

      const firstPurchaseOrderValue = firstRow.get('purchaseOrder')?.value;
      const firstShipmentDate = firstRow.get('shipmentDate')?.value;

      if (firstPurchaseOrderValue) {
        group.get('purchaseOrder')?.setValue(firstPurchaseOrderValue);
      }

      if (firstShipmentDate) {
        group.get('shipmentDate')?.setValue(firstShipmentDate);
      }
    }

    this.purchaseOrderArray.push(group);

    const sizesArray = this.getSizesArray(group);
    const firstSize = sizesArray.at(0) as FormGroup;

    const wasteFields: string[] = [
      'knitting_Waste',
      'Dyeing_Waste',
      'Cutting_Waste',
      'Printing_Waste',
      'Embroidery_Waste',
      'GWP_Laundry_Waste',
      'Sewing_Waste'
    ];

    wasteFields.forEach(field => {

      const mainValue = this.workOrderForm.get(field)?.value;
      const colorField = 'color_' + field;

      if (mainValue > 0) {
        firstSize.get(colorField)?.setValue(mainValue, { emitEvent: false });
      }

    });

    this.setupColorToMainSync(firstSize);
  }


  removePurchaseOrder(index: number): void {
    if (this.purchaseOrderArray.length > 1) {
      this.purchaseOrderArray.removeAt(index);
    }
  }



  setupMainToColorSync() {
    const wasteFields: string[] = [
      'knitting_Waste',
      'Dyeing_Waste',
      'Cutting_Waste',
      'Printing_Waste',
      'Embroidery_Waste',
      'GWP_Laundry_Waste',
      'Sewing_Waste'
    ];

    wasteFields.forEach(field => {
      this.workOrderForm.get(field)?.valueChanges.subscribe(value => {
        this.purchaseOrderArray.controls.forEach(poGroup => {
          const sizesArray = this.getSizesArray(poGroup as FormGroup);
          sizesArray.controls.forEach(sizeGroup => {
            const colorField = 'color_' + field;
            if (sizeGroup.get(colorField)) {
              if (value > 0 && value <= 100) {
                sizeGroup.get(colorField)?.setValue(value, { emitEvent: false });
              } else {
                sizeGroup.get(colorField)?.setValue(null, { emitEvent: false });
              }
            }
          });
        });
      });
    });
  }


  setupColorToMainSync(sizeGroup: FormGroup) {
    const wasteFields: string[] = [
      'knitting_Waste',
      'Dyeing_Waste',
      'Cutting_Waste',
      'Printing_Waste',
      'Embroidery_Waste',
      'GWP_Laundry_Waste',
      'Sewing_Waste'
    ];

    wasteFields.forEach(field => {
      const colorField = 'color_' + field;
      sizeGroup.get(colorField)?.valueChanges.subscribe(value => {

        if (value !== null && value !== undefined && value > 0) {
          this.workOrderForm.get(field)?.setValue(null, { emitEvent: false });
        }
      });
    });
  }


  toggleLock(): void {
    this.isLocked = !this.isLocked;
    if (this.isLocked) {
      this.workOrderForm.disable();
    } else {
      this.workOrderForm.enable();
    }
  }

  onWasteInput(field: string, event: any) {
    let value = event.target.value;

    if (!value) return;
    const num = Number(value);
    if (num <= 0 || num > 100) {

      this.workOrderForm.get(field)?.setValue('', { emitEvent: false });
    }
  }


  cancel(): void {
    this.router.navigate(['/ikgs/work-order']);
  }


  save(): void {
    console.log('workOrderForm:', this.workOrderForm.value);
    //this.router.navigate(['/ikgs/work-order']);

    this.AddUpdateWorkOrder();
  }


 


  allStyle: WritableSignal<SelectionValueModel[]> = signal([]);
  allCustomers: WritableSignal<SelectionValueModel[]> = signal([]);
  allColors: WritableSignal<SelectionValueModel[]> = signal([]);
  allSizes: WritableSignal<SelectionValueModel[]> = signal([]);


  ngOnInit() {

    this.callCatalogApis();

    this.setupMainToColorSync();

    this.purchaseOrderArray.controls.forEach(poGroup => {
      const sizesArray = this.getSizesArray(poGroup as FormGroup);

      sizesArray.controls.forEach(sizeGroup => {
        this.setupColorToMainSync(sizeGroup as FormGroup);
      });
    });

    this.minDate = new Date();

  }


  callCatalogApis() {
    this.getAllStyle();
    this.getAllCustomers();
    this.getAllColors();
    this.getAllSizes();
  }


  getAllStyle() {
    this.allStyle.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Catalog;
    authApiOpts.EndPoint = EndPoints.GetAllStyle;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allStyle.set(result.Data);
        }
      })
  }


  getAllCustomers() {
    this.allCustomers.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Catalog;
    authApiOpts.EndPoint = EndPoints.AllCustomers;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allCustomers.set(result.Data);
        }
      })
  }


  getAllColors() {
    this.allColors.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Catalog;
    authApiOpts.EndPoint = EndPoints.GetAllColors;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allColors.set(result.Data);
        }
      })
  }


  getAllSizes() {
    this.allSizes.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Catalog;
    authApiOpts.EndPoint = EndPoints.GetAllPanelSizes;
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allSizes.set(result.Data);
        }
      })
  }


  AddUpdateWorkOrder() {
    this.loading.set(true);
    let apiOpts: ApiOptionsModel<WorkOrderDto> = new ApiOptionsModel<WorkOrderDto>();
    apiOpts.RequestType = RequestType.POST;
    apiOpts.ParamObj = this.workOrderForm.value;
    apiOpts.Repository = Repository.Order;
    apiOpts.EndPoint = EndPoints.AddUpdateWorkOrder;
    this.restService.CallApi<WorkOrderDto, WorkOrderDto>(apiOpts).subscribe(
      (result: ApiResponseModel<WorkOrderDto>) => {
        if (result) {
          if (result.Code === 200) {
            if (result.Data) {
              this.loading.set(false);

              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Basic configuration saved successfully.'
              });
            }
          } else {
            this.loading.set(false)
          }
        }
      },
      (error: any) => {
        this.loading.set(false);
      }
    );
  }







}
