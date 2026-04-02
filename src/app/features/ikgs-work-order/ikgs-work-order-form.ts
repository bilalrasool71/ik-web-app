import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { ApiOptionsModel, ApiResponseModel } from '../../core/models/api.model';
import { EndPoints, Repository, RequestType } from '../../core/enums/api.enum';
import { FloatLabelModule } from 'primeng/floatlabel';
import { WorkOrderColorDto, WorkOrderDto } from '../../models/domain/work-order.model';




@Component({
  selector: 'app-ikgs-work-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule,
    InputTextModule, ButtonModule, DatePickerModule, FloatLabelModule],
  templateUrl: './ikgs-work-order-form.html',
  styleUrl: './ikgs-work-order-form.scss',
})
export class IkgsWorkOrderForm implements OnInit {

  paramWoNo: WritableSignal<number> = signal(0);
  restService = inject(IkgsRest);
  messageService = inject(MessageService);
  activatedRoute = inject(ActivatedRoute);
  loading = signal(false);
  datePipe = inject(DatePipe);
  workOrderForm: FormGroup;
  isLocked: boolean = false;
  minDate: Date = new Date();


  constructor(private fb: FormBuilder, private router: Router) {

    this.workOrderForm = this.fb.group({
      customer: [null, Validators.required],
      style_Id: [null, Validators.required],
      wo: [0],
      //edate: [null],
      rec_Date: [null, Validators.required],
      order_Staus: ['R'],
      eby: [2],
      eip: [null],
      lock_Flag: ['N'],
      mby: [null],
      mip: [null],
      mdate: [null],
      isClose: [false],
      close_Date: [null],
      close_By: [null],
      close_Ip: [null],


      //Temp
      knitting_Waste: [null],
      dyeing_Waste: [null],
      cutting_Waste: [null],
      printing_Waste: [null],
      embroidery_Waste: [null],
      gWP_Laundry_Waste: [null],
      sewing_Waste: [null],


      colorsDetailList: this.fb.array([this.createColorRow()])
    });


    this.paramWoNo.set(this.activatedRoute.snapshot.params['woNo']);
    if (this.paramWoNo() > 0) {
      this.GetSingleWorkOrder();
    }
  }

  createColorRow(): FormGroup {
    return this.fb.group({
      wo: [0],
      customer_Po: [null],
      color_RowId: [0],
      color_Id: [null, Validators.required],
      ship_Date: [null, Validators.required],
      //edate: [null],
      eby: [2],
      eip: [null],
      mby: [null],
      mip: [null],
      mdate: [null],
      is_Active: ['Y'],

      sizeDetailList: this.fb.array([this.createSizeRow()])
    });
  }

  getWasteLabel(type: number): string {

    const map: any = {
      1: 'Knitting',
      2: 'Dyeing',
      3: 'Cutting',
      4: 'Printing',
      5: 'Embroidery',
      6: 'GWP/Laundry',
      7: 'Sewing'
    };

    return map[type] || '';
  }


  createSizeRow(): FormGroup {

    const group = this.fb.group({
      wo: [0],
      color_RowId: [0],
      size_RowId: [0],
      size_Id: [null, Validators.required],
      qty: [null, Validators.required],
      excess_Qty: [null],
      uom: [null],
      //edate: [null],
      eby: [2],
      eip: [null],
      mby: [null],
      mip: [null],
      mdate: [null],
      is_Active: ['Y'],
      wastagesList: this.fb.array([])
    });

    const wasteTypes = [
      { id: 1, label: 'Knitting' },
      { id: 2, label: 'Dyeing' },
      { id: 3, label: 'Cutting' },
      { id: 4, label: 'Printing' },
      { id: 5, label: 'Embroidery' },
      { id: 6, label: 'GWP/Laundry' },
      { id: 7, label: 'Sewing' }
    ];

    wasteTypes.forEach(w => {
      (group.get('wastagesList') as FormArray).push(
        this.fb.group({
          wo: [0],
          color_RowId: 0,
          size_RowId: 0,
          wastage_Type: w.id,
          wastage: null,
          wast_RowId: 0
        })
      );
    });

    return group;
  }


  createWastageRow(): FormGroup {
    return this.fb.group({
      wo: [0],
      color_RowId: [0],
      size_RowId: [0],
      wastage_Type: [null, Validators.required],
      wastage: [null, Validators.required],
      wast_RowId: [0]
    });
  }


  setupWastageBiDirectionalSync() {
    const wasteMap = [
      { field: 'knitting_Waste', type: 1 },
      { field: 'dyeing_Waste', type: 2 },
      { field: 'cutting_Waste', type: 3 },
      { field: 'printing_Waste', type: 4 },
      { field: 'embroidery_Waste', type: 5 },
      { field: 'gWP_Laundry_Waste', type: 6 },
      { field: 'sewing_Waste', type: 7 }
    ];


    const subscribeSizeToMain = (sizeGroup: FormGroup) => {
      const wasteArray = this.getWastagesArray(sizeGroup);
      wasteArray.controls.forEach(ctrl => {
        ctrl.get('wastage')?.valueChanges.subscribe(value => {
          const type = ctrl.get('wastage_Type')?.value;
          const mainField = wasteMap.find(w => w.type === type)?.field;

          if (!value || value <= 0) {

            ctrl.get('wastage')?.setValue(null, { emitEvent: false });
          }
          else if (value > 100) {

            ctrl.get('wastage')?.setValue(100, { emitEvent: false });
            if (mainField) {
              this.workOrderForm.get(mainField)?.setValue(null, { emitEvent: false });
            }
          }
          else {

            if (mainField) {
              this.workOrderForm.get(mainField)?.setValue(null, { emitEvent: false });
            }
          }
        });
      });
    };


    wasteMap.forEach(w => {
      this.workOrderForm.get(w.field)?.valueChanges.subscribe(value => {
        const validValue = value && value > 0 && value <= 100 ? value : null;

        this.colorsArray.controls.forEach(color => {
          const sizes = this.getSizesArray(color as FormGroup);
          sizes.controls.forEach(size => {
            const wasteArray = this.getWastagesArray(size as FormGroup);
            wasteArray.controls.forEach(ctrl => {
              if (ctrl.get('wastage_Type')?.value === w.type) {
                ctrl.get('wastage')?.setValue(validValue, { emitEvent: false });
              }
            });
          });
        });


        if (!validValue) {
          this.colorsArray.controls.forEach(color => {
            const sizes = this.getSizesArray(color as FormGroup);
            sizes.controls.forEach(size => {
              const wasteArray = this.getWastagesArray(size as FormGroup);
              wasteArray.controls.forEach(ctrl => {
                if (ctrl.get('wastage_Type')?.value === w.type) {
                  ctrl.get('wastage')?.setValue(null, { emitEvent: false });
                }
              });
            });
          });
        }
      });
    });


    this.colorsArray.controls.forEach(color => {
      const sizes = this.getSizesArray(color as FormGroup);
      sizes.controls.forEach(size => {
        subscribeSizeToMain(size as FormGroup);
      });
    });


    this.colorsArray.valueChanges.subscribe(() => {
      this.colorsArray.controls.forEach(color => {
        const sizes = this.getSizesArray(color as FormGroup);
        sizes.controls.forEach(size => {
          if (!(size as any).__subscribed) {
            subscribeSizeToMain(size as FormGroup);
            (size as any).__subscribed = true;
          }
        });
      });
    });
  }

  get colorsArray(): FormArray {
    return this.workOrderForm.get('colorsDetailList') as FormArray;
  }

  getSizesArray(colorGroup: FormGroup): FormArray {
    return colorGroup.get('sizeDetailList') as FormArray;
  }

  getWastagesArray(sizeGroup: AbstractControl): FormArray {
    return sizeGroup.get('wastagesList') as FormArray;
  }




  getColorGroup(index: number): FormGroup {
    return this.colorsArray.at(index) as FormGroup;
  }


  addColor(): void {
    const group = this.createColorRow();

    if (this.colorsArray.length > 0) {
      const firstRow = this.colorsArray.at(0) as FormGroup;

      const firstPurchaseOrderValue = firstRow.get('customer_Po')?.value;
      const firstShipmentDate = firstRow.get('ship_Date')?.value;

      if (firstPurchaseOrderValue) {
        group.get('customer_Po')?.setValue(firstPurchaseOrderValue);
      }

      if (firstShipmentDate) {
        group.get('ship_Date')?.setValue(firstShipmentDate);
      }


      const wasteFields: string[] = [
        'knitting_Waste',
        'dyeing_Waste',
        'cutting_Waste',
        'printing_Waste',
        'embroidery_Waste',
        'gWP_Laundry_Waste',
        'sewing_Waste'
      ];

      const firstSize = this.getSizesArray(group).at(0) as FormGroup;

      wasteFields.forEach(field => {
        const mainValue = this.workOrderForm.get(field)?.value;
        const wastageCtrl = firstSize.get('wastagesList') as FormArray;

        if (mainValue && mainValue > 0) {
          wastageCtrl.controls.forEach(ctrl => {
            if (ctrl.get('wastage_Type')?.value === wasteFields.indexOf(field) + 1) {
              ctrl.get('wastage')?.setValue(mainValue, { emitEvent: false });
            }
          });
        }
      });
    }

    this.colorsArray.push(group);
  }


  removeColor(index: number) {
    if (this.colorsArray.length > 1) this.colorsArray.removeAt(index);
  }


  addSize(colorGroup: FormGroup) {
    const newSize = this.createSizeRow();
    const wasteFields: string[] = [
      'knitting_Waste',
      'dyeing_Waste',
      'cutting_Waste',
      'printing_Waste',
      'embroidery_Waste',
      'gWP_Laundry_Waste',
      'sewing_Waste'
    ];


    wasteFields.forEach(field => {
      const mainValue = this.workOrderForm.get(field)?.value;
      if (mainValue && mainValue > 0) {
        const wastageCtrl = newSize.get('wastagesList') as FormArray;
        wastageCtrl.controls.forEach(ctrl => {
          if (ctrl.get('wastage_Type')?.value === wasteFields.indexOf(field) + 1) {
            ctrl.get('wastage')?.setValue(mainValue, { emitEvent: false });
          }
        });
      }
    });

    this.getSizesArray(colorGroup).push(newSize);
  }


  removeSize(colorGroup: FormGroup, index: number) {
    const sizes = this.getSizesArray(colorGroup);
    if (sizes.length > 1) sizes.removeAt(index);
  }


  isMainFieldsValid(index: number): boolean {
    const group = this.colorsArray.at(index) as FormGroup;
    return !!group.get('customer_Po')?.value &&
      !!group.get('color_Id')?.value &&
      !!group.get('ship_Date')?.value;
  }


  createPurchaseOrderRow(): FormGroup {
    return this.fb.group({
      purchaseOrder: [null, Validators.required],
      color: [null, Validators.required],
      shipmentDate: [null, Validators.required],

      sizes: this.fb.array([this.createSizeRow()]),

    })
  }


  toggleLock(): void {
    this.isLocked = !this.isLocked;
    this.applyLock(this.isLocked);
  }



  applyLock(lock: boolean) {
    this.workOrderForm.get('lock_Flag')?.setValue(lock ? 'Y' : 'N');



    const topFields = [
      'customer', 'style_Id', 'rec_Date',
      'knitting_Waste', 'dyeing_Waste', 'cutting_Waste',
      'printing_Waste', 'embroidery_Waste', 'gWP_Laundry_Waste', 'sewing_Waste'
    ];
    topFields.forEach(f => {
      const ctrl = this.workOrderForm.get(f);
      if (ctrl) lock ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false });
    });

    this.colorsArray.controls.forEach(colorGroup => {
      const sizes = this.getSizesArray(colorGroup as FormGroup);

      sizes.controls.forEach(sizeGroup => {
        ['size_Id', 'qty', 'excess_Qty', 'uom'].forEach(sf => {
          const ctrl = (sizeGroup as FormGroup).get(sf);
          if (ctrl) lock ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false });
        });

        const wastes = this.getWastagesArray(sizeGroup);
        wastes.controls.forEach(wCtrl => {
          const wastageControl = wCtrl.get('wastage');
          if (wastageControl) lock ? wastageControl.disable({ emitEvent: false }) : wastageControl.enable({ emitEvent: false });
        });
      });

      ['customer_Po', 'color_Id', 'ship_Date'].forEach(cf => {
        const ctrl = (colorGroup as FormGroup).get(cf);
        if (ctrl) lock ? ctrl.disable({ emitEvent: false }) : ctrl.enable({ emitEvent: false });
      });
    });
  }


  onWasteInput(field: string, event: any) {
    let value = event.target.value;

    if (!value) return;

    // Allow values starting with 0. like 0.05
    if (/^\d*\.?\d*$/.test(value)) {
      const num = parseFloat(value);
      if (num > 100) {
        this.workOrderForm.get(field)?.setValue('', { emitEvent: false });
      }
    } else {
      // Invalid input (letters etc.)
      this.workOrderForm.get(field)?.setValue('', { emitEvent: false });
    }
  }




  getAvailableColors(cIndex: number): SelectionValueModel[] {

    const selectedColors = this.colorsArray.controls
      .filter((_, i) => i !== cIndex)
      .map(c => c.get('color_Id')?.value)
      .filter(v => v);

    return this.allColors().filter(color => !selectedColors.includes(color.value));
  }




  getAvailableSizes(cIndex: number, sIndex: number): SelectionValueModel[] {
    const currentColorGroup = this.colorsArray.at(cIndex) as FormGroup;
    const currentSizesArray = this.getSizesArray(currentColorGroup);

    const selectedInCurrentColor = currentSizesArray.controls
      .filter((_, i) => i !== sIndex)
      .map(s => s.get('size_Id')?.value)
      .filter(v => v);

    const selectedInOtherColors = this.colorsArray.controls
      .filter((_, i) => i !== cIndex)
      .flatMap(colorCtrl => this.getSizesArray(colorCtrl as FormGroup).controls)
      .map(s => s.get('size_Id')?.value)
      .filter(v => v);

    const allSelected = [...selectedInCurrentColor, ...selectedInOtherColors];

    return this.allSizes().filter(size => !allSelected.includes(size.value));
  }



  cancel(): void {
    this.router.navigate(['/ikgs/work-order']);
  }


  allStyle: WritableSignal<SelectionValueModel[]> = signal([]);
  allCustomers: WritableSignal<SelectionValueModel[]> = signal([]);
  allColors: WritableSignal<SelectionValueModel[]> = signal([]);
  allSizes: WritableSignal<SelectionValueModel[]> = signal([]);


  ngOnInit() {
    this.callCatalogApis();
    this.setupWastageBiDirectionalSync();
  }


  callCatalogApis() {
    this.getAllStyle();
    this.getAllCustomers();
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


  getAllColors(style_Id: string) {
    this.allColors.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.StyleConfiguration;
    authApiOpts.EndPoint = EndPoints.GetStyleConfigColorShortByStyleIdForFabricAsync;
    authApiOpts.ReqQueryParams = [{ Key: 'style_Id', Value: style_Id, IsDate: false }];
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allColors.set(result.Data);
        }
      })
  }


  getAllSizes(style_Id: string) {
    this.allSizes.set([]);
    let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.StyleConfiguration;
    authApiOpts.EndPoint = EndPoints.GetStyleConfigSizeShortByStyleIdForFiberAsync;
    authApiOpts.ReqQueryParams = [{ Key: 'style_Id', Value: style_Id, IsDate: false }];
    this.restService
      .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
      .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
        if (result?.Code === 200 && result.Data) {
          this.allSizes.set(result.Data);
        }
      })
  }

  AddUpdateWorkOrder() {

    if (!this.workOrderForm.valid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid',
        detail: 'Please fill all required fields!'
      });
      return;
    }

    this.workOrderForm.get('lock_Flag')?.setValue(this.isLocked ? 'Y' : 'N');

    let payload = { ...this.workOrderForm.getRawValue() };
    if (payload.rec_Date) {
      payload.rec_Date = this.datePipe.transform(payload.rec_Date, 'dd-MMM-yyyy');
    }
    payload.colorsDetailList.forEach((color: any) => {
      if (color.ship_Date) {
        color.ship_Date = this.datePipe.transform(color.ship_Date, 'dd-MMM-yyyy');
      }
      color.sizeDetailList.forEach((size: any) => {
        size.wastagesList = size.wastagesList.filter((w: any) => {
          return w.wastage && w.wastage > 0;
        });
      });
    });
    //console.log('payloads::', payload);


    this.loading.set(true);
    let apiOpts: ApiOptionsModel<WorkOrderDto> = new ApiOptionsModel<WorkOrderDto>();
    apiOpts.RequestType = RequestType.POST;
    apiOpts.ParamObj = payload;
    apiOpts.Repository = Repository.Order;
    apiOpts.EndPoint = EndPoints.AddUpdateWorkOrder;

    this.restService.CallApi<WorkOrderDto, WorkOrderDto>(apiOpts).subscribe(
      (result: ApiResponseModel<WorkOrderDto>) => {
        if (result?.Code === 200 && result.Data) {

          //console.log('form data response::', result.Data);

          this.loading.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Work order saved successfully.'
          });

        }
      },
      (error: any) => {
        this.loading.set(false);
        console.error('Save failed', error);
      }
    );
  }

  GetSingleWorkOrder() {
    let authApiOpts = new ApiOptionsModel<WorkOrderDto>();
    authApiOpts.RequestType = RequestType.GET;
    authApiOpts.Repository = Repository.Order;
    authApiOpts.EndPoint = EndPoints.GetSingleWorkOrder;
    authApiOpts.ReqQueryParams = [
      {
        Key: 'wo',
        Value: this.paramWoNo(),
        IsDate: false
      }
    ]
    this.restService
      .CallApi<WorkOrderDto, WorkOrderDto>(authApiOpts)
      .subscribe((result: ApiResponseModel<WorkOrderDto>) => {
        if (result?.Code === 200 && result.Data) {
          setTimeout(() => {
            this.patchValueToForm(result.Data!);

            this.isLocked = result.Data?.lock_Flag === 'Y';
            if (this.isLocked) {
              this.applyLock(true);
            }

          })
        }
      });
  }




  patchValueToForm(obj: WorkOrderDto) {
    const stringifiedData = this.convertValuesToString(obj);

    if (stringifiedData.rec_Date) {
      stringifiedData.rec_Date = new Date(stringifiedData.rec_Date);
    }

    this.colorsArray.clear();

    if (stringifiedData.colorsDetailList && Array.isArray(stringifiedData.colorsDetailList)) {
      stringifiedData.colorsDetailList.forEach((color: WorkOrderColorDto) => {
        color = this.convertValuesToString(color);
        const colorGroup = this.createColorRow();
        const validShipDate = color.ship_Date ? new Date(color.ship_Date) : null;

        colorGroup.patchValue({
          wo: color.wo,
          customer_Po: color.customer_Po,
          color_RowId: color.color_RowId,
          color_Id: color.color_Id,
          ship_Date: validShipDate,
          edate: color.edate,
          eby: color.eby
        });

        const sizesArray = colorGroup.get('sizeDetailList') as FormArray;
        sizesArray.clear();

        if (color.sizeDetailList && Array.isArray(color.sizeDetailList)) {
          color.sizeDetailList.forEach((size: any) => {
            const sizeGroup = this.createSizeRow();
            sizeGroup.patchValue({
              wo: size.wo,
              color_RowId: size.color_RowId,
              size_RowId: size.size_RowId,
              size_Id: size.size_Id,
              qty: size.qty,
              excess_Qty: size.excess_Qty,
              uom: size.uom,
              edate: size.edate,
              eby: size.eby
            });

            const wastagesArray = sizeGroup.get('wastagesList') as FormArray;
            if (size.wastagesList && Array.isArray(size.wastagesList)) {
              size.wastagesList.forEach((waste: any, index: number) => {
                const wCtrl = wastagesArray.at(index);
                if (wCtrl) {
                  wCtrl.patchValue({
                    wo: waste.wo,
                    color_RowId: waste.color_RowId,
                    size_RowId: waste.size_RowId,
                    wastage_Type: waste.wastage_Type,
                    wastage: waste.wastage,
                    wast_RowId: waste.wast_RowId
                  });
                }
              });
            }

            sizesArray.push(sizeGroup);
          });
        }

        this.colorsArray.push(colorGroup);
      });
    }

    this.workOrderForm.patchValue({
      customer: stringifiedData.customer,
      style_Id: stringifiedData.style_Id,
      wo: stringifiedData.wo,
      rec_Date: stringifiedData.rec_Date,
      order_Staus: stringifiedData.order_Staus,
      eby: stringifiedData.eby,
      lock_Flag: stringifiedData.lock_Flag,
      mby: stringifiedData.mby,
      mip: stringifiedData.mip,
      mdate: stringifiedData.mdate,
      isClose: stringifiedData.isClose,
      close_Date: stringifiedData.close_Date,
      close_By: stringifiedData.close_By,
      close_Ip: stringifiedData.close_Ip,
      knitting_Waste: stringifiedData.knitting_Waste,
      dyeing_Waste: stringifiedData.dyeing_Waste,
      cutting_Waste: stringifiedData.cutting_Waste,
      printing_Waste: stringifiedData.printing_Waste,
      embroidery_Waste: stringifiedData.embroidery_Waste,
      gWP_Laundry_Waste: stringifiedData.gWP_Laundry_Waste,
      sewing_Waste: stringifiedData.sewing_Waste
    });

    //console.log('Form patched with all colors, sizes & wastages', obj);

  }

  convertValuesToString(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      if (typeof obj === 'string' && obj.includes('T')) return obj;
      return typeof obj === 'number' ? obj.toString() : obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.convertValuesToString(item));
    }
    const newObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        newObj[key] = this.convertValuesToString(obj[key]);
      }
    }
    return newObj;
  }


  onStyleChange(event: any) {
    const selectedValue = event.value; // This is the value of the selected option
    console.log('Selected style value:', selectedValue);    
    this.getAllColors(selectedValue);
    this.getAllSizes(selectedValue)
  }
}