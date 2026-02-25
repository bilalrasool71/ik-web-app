import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { Router } from '@angular/router';


@Component({
  selector: 'app-ikgs-work-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SelectModule,
    InputTextModule, ButtonModule, DatePickerModule],
  templateUrl: './ikgs-work-order-form.html',
  styleUrl: './ikgs-work-order-form.scss',
})
export class IkgsWorkOrderForm {

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
      { label: 'color 1', value: 'color 1'},
      { label: 'color 2', value: 'color 2'},
      { label: 'color 3', value: 'color 3'},
      { label: 'color 4', value: 'color 4'},
    ]



  workOrderForm: FormGroup;

  isLocked = false;

  constructor(private fb: FormBuilder, private router: Router) {

    this.workOrderForm = this.fb.group({

      style: [null, Validators.required],
      customer: [null, Validators.required],
      date: [null, Validators.required],

      purchaseOrder: this.fb.array([this.createPurchaseOrderRow()]),

    })
  }


  createPurchaseOrderRow(): FormGroup{
    return this.fb.group({
      purchaseOrder: [null, Validators.required],
      color: [null, Validators.required],
      shipmentDate: [null, Validators.required],

      colorSize: [null],
      colorDetail: [null]
    })
  }

  get purchaseOrderArray(): FormArray {
        return this.workOrderForm.get('purchaseOrder') as FormArray;
    }

  addPurchaseOrder(): void {
        this.purchaseOrderArray.push(this.createPurchaseOrderRow());
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

}
