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


  //Dummy Data
  styleOptions = [
    { label: 'style 1', value: 'style 1' },
    { label: 'style 2', value: 'style 2' },
    { label: 'style 3', value: 'style 3' },
    { label: 'style 4', value: 'style 4' },
  ];

  customerOptions = [
    { label: 'customer 1', value: 'customer 1' },
    { label: 'customer 2', value: 'customer 2' },
    { label: 'customer 3', value: 'customer 3' },
    { label: 'customer 4', value: 'customer 4' },
  ]

  colorOptions = [
    { label: 'color 1', value: 'color 1' },
    { label: 'color 2', value: 'color 2' },
    { label: 'color 3', value: 'color 3' },
    { label: 'color 4', value: 'color 4' },
  ]



  workOrderForm: FormGroup;

  isLocked: boolean = false;


  constructor(private fb: FormBuilder, private router: Router) {

    this.workOrderForm = this.fb.group({

      style: [null, Validators.required],
      customer: [null, Validators.required],
      date: [null, Validators.required],

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

      colorSize: [null, Validators.required],
      colorDetail: [null, Validators.required],

      color_knitting_Waste: [null, Validators.required],
      color_Dyeing_Waste: [null, Validators.required],
      color_Cutting_Waste: [null, Validators.required],
      color_Printing_Waste: [null, Validators.required],
      color_Embroidery_Waste: [null, Validators.required],
      color_GWP_Laundry_Waste: [null, Validators.required],
      color_Sewing_Waste: [null, Validators.required],
    })
  }

  get purchaseOrderArray(): FormArray {
    return this.workOrderForm.get('purchaseOrder') as FormArray;
  }


  addPurchaseOrder(): void {
    
    //this.purchaseOrderArray.push(this.createPurchaseOrderRow());

    const group = this.createPurchaseOrderRow();
    this.purchaseOrderArray.push(group);
    this.setupColorToMainSync(group);
  }


  setupMainToColorSync() {

    const wasteFields = [
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

        this.purchaseOrderArray.controls.forEach(group => {

          const colorField = 'color_' + field;

          if (group.get(colorField)) {
            if (value > 0 && value <= 100) {
              group.get(colorField)?.setValue(value, { emitEvent: false });
            } else {
              group.get(colorField)?.setValue(null, { emitEvent: false });
            }
          }

        });

      });

    });

  }



  setupColorToMainSync(group: FormGroup) {

    const wasteFields = [
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

      group.get(colorField)?.valueChanges.subscribe(value => {

        if (value !== null && value !== undefined && value > 0) {
          this.workOrderForm.get(field)?.setValue(null, { emitEvent: false });
        }

      });

    });

  }

  removePurchaseOrder(index: number): void {
    if (this.purchaseOrderArray.length > 1) {
      this.purchaseOrderArray.removeAt(index);
    }
  }



  toggleLock(): void {
    this.isLocked = !this.isLocked;
    if (this.isLocked) {
      this.workOrderForm.disable();
    } else {
      this.workOrderForm.enable();
    }
  }


  cancel(): void {
    this.router.navigate(['/ikgs/work-order']);
  }


  save(): void {
    console.log('workOrderForm:', this.workOrderForm.value);
    this.router.navigate(['/ikgs/work-order']);
  }



  allCustomers: WritableSignal<SelectionValueModel[]> = signal([]);


  ngOnInit() {

    this.callCatalogApis();

    this.setupMainToColorSync();
    this.purchaseOrderArray.controls.forEach(group => {
      this.setupColorToMainSync(group as FormGroup);
    });

  }





  onWasteInput(field: string, event: any) {
    let value = event.target.value;

    if (!value) return;
    const num = Number(value);
    if (num <= 0 || num > 100) {

      this.workOrderForm.get(field)?.setValue('', { emitEvent: false });
    }
  }

  callCatalogApis() {
    this.getAllCustomers();
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
          this.allCustomers.set(result.Data)
        }
      })
  }

}
