import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
    selector: 'app-ikgs-style-configuration-form',
    standalone: true,
    imports: [
        CommonModule, ReactiveFormsModule,
        StepperModule, SelectModule, InputTextModule,
        RadioButtonModule, ButtonModule, TextareaModule,
        TableModule, InputNumberModule
    ],
    templateUrl: './ikgs-style-configuration-form.html',
    styleUrl: './ikgs-style-configuration-form.scss',
})
export class IkgsStyleConfigurationForm {
    activeStep = signal(0);

    // Dropdown options
    customerOptions = [
        { label: 'Nike', value: 'Nike' },
        { label: 'Adidas', value: 'Adidas' },
        { label: 'Puma', value: 'Puma' },
        { label: 'H&M', value: 'H&M' },
    ];
    seasonOptions = [
        { label: 'Spring 2026', value: 'Spring 2026' },
        { label: 'Summer 2026', value: 'Summer 2026' },
        { label: 'Fall 2026', value: 'Fall 2026' },
        { label: 'Winter 2026', value: 'Winter 2026' },
    ];
    genderOptions = [
        { label: 'Men', value: 'Men' },
        { label: 'Women', value: 'Women' },
        { label: 'Kids', value: 'Kids' },
        { label: 'Unisex', value: 'Unisex' },
    ];
    productTypeOptions = [
        { label: 'T-Shirt', value: 'T-Shirt' },
        { label: 'Polo Shirt', value: 'Polo Shirt' },
        { label: 'Shorts', value: 'Shorts' },
        { label: 'Hoodie', value: 'Hoodie' },
        { label: 'Joggers', value: 'Joggers' },
    ];
    productSubTypeOptions = [
        { label: 'Crew Neck', value: 'Crew Neck' },
        { label: 'V-Neck', value: 'V-Neck' },
        { label: 'Round Neck', value: 'Round Neck' },
    ];
    colorOptions = [
        { label: 'Black', value: 'Black' },
        { label: 'White', value: 'White' },
        { label: 'Navy Blue', value: 'Navy Blue' },
        { label: 'Red', value: 'Red' },
        { label: 'Grey', value: 'Grey' },
        { label: 'Green', value: 'Green' },
    ];
    placementOptions = [
        { label: 'Front', value: 'Front' },
        { label: 'Back', value: 'Back' },
        { label: 'Left Chest', value: 'Left Chest' },
        { label: 'Right Sleeve', value: 'Right Sleeve' },
    ];
    printTypeOptions = [
        { label: 'Screen Print', value: 'Screen Print' },
        { label: 'Digital Print', value: 'Digital Print' },
        { label: 'Heat Transfer', value: 'Heat Transfer' },
    ];
    designOptions = [
        { label: 'Logo', value: 'Logo' },
        { label: 'All Over', value: 'All Over' },
        { label: 'Placement', value: 'Placement' },
    ];
    embTypeOptions = [
        { label: 'Flat', value: 'Flat' },
        { label: '3D Puff', value: '3D Puff' },
        { label: 'Chain Stitch', value: 'Chain Stitch' },
    ];
    washTypeOptions = [
        { label: 'Enzyme Wash', value: 'Enzyme Wash' },
        { label: 'Silicon Wash', value: 'Silicon Wash' },
        { label: 'Garment Dye', value: 'Garment Dye' },
    ];
    panelOptions = [
        { label: 'Front Panel', value: 'Front Panel' },
        { label: 'Back Panel', value: 'Back Panel' },
        { label: 'Sleeve', value: 'Sleeve' },
        { label: 'Collar', value: 'Collar' },
        { label: 'Rib', value: 'Rib' },
    ];
    panelSizeOptions = [
        { label: 'S', value: 'S' },
        { label: 'M', value: 'M' },
        { label: 'L', value: 'L' },
        { label: 'XL', value: 'XL' },
    ];
    fabricOptions = [
        { label: 'Single Jersey', value: 'Single Jersey' },
        { label: 'Pique', value: 'Pique' },
        { label: 'Interlock', value: 'Interlock' },
        { label: 'Fleece', value: 'Fleece' },
        { label: 'Rib', value: 'Rib' },
    ];
    compositionOptions = [
        { label: '100% Cotton', value: '100% Cotton' },
        { label: '60/40 CVC', value: '60/40 CVC' },
        { label: '100% Polyester', value: '100% Polyester' },
        { label: '50/50 TC', value: '50/50 TC' },
    ];
    fabricColorOptions = [
        { label: 'White', value: 'White' },
        { label: 'Black', value: 'Black' },
        { label: 'Melange Grey', value: 'Melange Grey' },
        { label: 'Navy', value: 'Navy' },
    ];
    dyeProcessOptions = [
        { label: 'Reactive Dye', value: 'Reactive Dye' },
        { label: 'Disperse Dye', value: 'Disperse Dye' },
        { label: 'Pigment Dye', value: 'Pigment Dye' },
    ];
    specialProcessOptions = [
        { label: 'Peach Finish', value: 'Peach Finish' },
        { label: 'Brushed', value: 'Brushed' },
        { label: 'Anti-Pilling', value: 'Anti-Pilling' },
    ];
    printDesignOptions = [
        { label: 'Stripe', value: 'Stripe' },
        { label: 'Camo', value: 'Camo' },
        { label: 'Floral', value: 'Floral' },
    ];
    printColorOptions = [
        { label: 'Multi Color', value: 'Multi Color' },
        { label: 'Single Color', value: 'Single Color' },
        { label: 'Two Tone', value: 'Two Tone' },
    ];
    fiberOptions = [
        { label: 'Cotton', value: 'Cotton' },
        { label: 'Polyester', value: 'Polyester' },
        { label: 'Spandex', value: 'Spandex' },
        { label: 'Nylon', value: 'Nylon' },
    ];
    consumptionOptions = [
        { label: 'Regular', value: 'Regular' },
        { label: 'High', value: 'High' },
        { label: 'Low', value: 'Low' },
    ];
    fiberColorOptions = [
        { label: 'Raw White', value: 'Raw White' },
        { label: 'Optical White', value: 'Optical White' },
        { label: 'Melange', value: 'Melange' },
    ];

    // Size Consumption default rows
    sizeRows = [
        { size: 'XS' }, { size: 'S' }, { size: 'M' },
        { size: 'L' }, { size: 'XL' }, { size: 'XXL' }, { size: '3XL' },
    ];

    // Forms
    configForm: FormGroup;
    colorDetailsForm: FormGroup;
    fabricPanelsForm: FormGroup;
    fibersForm: FormGroup;
    sizeConsumptionForm: FormGroup;

    constructor(private fb: FormBuilder, private router: Router) {
        // Step 1
        this.configForm = this.fb.group({
            customer: [null, Validators.required],
            styleType: ['Garment'],
            season: [null, Validators.required],
            gender: [null, Validators.required],
            productType: [null],
            productSubType: [null],
            leadDays: [null],
            fabricGSM: [null],
            garmentGSM: [null],
            styleDescription: [''],
        });

        // Step 2
        this.colorDetailsForm = this.fb.group({
            colors: this.fb.array([this.createColorGroup()])
        });

        // Step 3
        this.fabricPanelsForm = this.fb.group({
            panels: this.fb.array([this.createPanelGroup()])
        });

        // Step 4
        this.fibersForm = this.fb.group({
            color: [null],
            fabric: [null],
            panel: [null],
            fibers: this.fb.array([this.createFiberRow(), this.createFiberRow(), this.createFiberRow()])
        });

        // Step 5
        this.sizeConsumptionForm = this.fb.group({
            color: [null],
            fabric: [null],
            panel: [null],
            sizes: this.fb.array(this.sizeRows.map(s => this.fb.group({
                size: [s.size],
                consumptionMtrs: [null],
                consumptionKgs: [null],
            })))
        });
    }

    // Color Details helpers
    createColorGroup(): FormGroup {
        return this.fb.group({
            color: [null],
            garmentPrint: ['Yes'],
            printPlacement: [null],
            printType: [null],
            printDesign: [null],
            garmentEmbroidery: ['Yes'],
            embPlacement: [null],
            embType: [null],
            embDesign: [null],
            garmentWash: ['Yes'],
            washType: [null],
        });
    }

    get colorsArray(): FormArray {
        return this.colorDetailsForm.get('colors') as FormArray;
    }

    addColor(): void {
        this.colorsArray.push(this.createColorGroup());
    }

    removeColor(index: number): void {
        if (this.colorsArray.length > 1) {
            this.colorsArray.removeAt(index);
        }
    }

    // Fabric Panels helpers
    createPanelGroup(): FormGroup {
        return this.fb.group({
            color: [null],
            panel: [null],
            panelSize: [null],
            fabric: [null],
            panelType: ['Main Body'],
            rndNumber: [''],
            composition: [null],
            widthType: ['Open'],
            width: [null],
            gsm: [null],
            fabricColor: [null],
            dyeProcessRoute: [null],
            specialProcess: [null],
            rotaryPrint: ['Yes'],
            printDesign: [null],
            printColor: [null],
        });
    }

    get panelsArray(): FormArray {
        return this.fabricPanelsForm.get('panels') as FormArray;
    }

    addPanel(): void {
        this.panelsArray.push(this.createPanelGroup());
    }

    removePanel(index: number): void {
        if (this.panelsArray.length > 1) {
            this.panelsArray.removeAt(index);
        }
    }

    // Fibers helpers
    createFiberRow(): FormGroup {
        return this.fb.group({
            fiber: [null],
            consumption: [null],
            ratio: [null],
            knitType: ['Knit'],
            yarnDye: ['Yes'],
            fiberColor: [null],
        });
    }

    get fibersArray(): FormArray {
        return this.fibersForm.get('fibers') as FormArray;
    }

    addFiber(): void {
        this.fibersArray.push(this.createFiberRow());
    }

    removeFiber(index: number): void {
        if (this.fibersArray.length > 1) {
            this.fibersArray.removeAt(index);
        }
    }

    // Size consumption
    get sizesArray(): FormArray {
        return this.sizeConsumptionForm.get('sizes') as FormArray;
    }

    // Navigation
    goToStep(step: number): void {
        this.activeStep.set(step);
    }

    nextStep(): void {
        if (this.activeStep() < 4) {
            this.activeStep.set(this.activeStep() + 1);
        }
    }

    prevStep(): void {
        if (this.activeStep() > 0) {
            this.activeStep.set(this.activeStep() - 1);
        }
    }

    save(): void {
        console.log('Configuration:', this.configForm.value);
        console.log('Color Details:', this.colorDetailsForm.value);
        console.log('Fabric Panels:', this.fabricPanelsForm.value);
        console.log('Fibers:', this.fibersForm.value);
        console.log('Size Consumption:', this.sizeConsumptionForm.value);
        this.router.navigate(['/ikgs/style-configuration']);
    }

    cancel(): void {
        this.router.navigate(['/ikgs/style-configuration']);
    }
}
