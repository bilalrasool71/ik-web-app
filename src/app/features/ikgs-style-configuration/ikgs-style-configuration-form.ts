import { Component, inject, signal, WritableSignal } from '@angular/core';
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
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { MessageService } from 'primeng/api';
import { IkgsRest } from '../../core/services/ikgs-rest';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel, ApiResponseModel } from '../../core/models/api.model';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LocalStorageEnum } from '../../core/enums/storage.enum';
import { StyleConfigMainDto } from '../../models/domain/style-configuration.model';
import { UserLoginRequestDto, UserLoginResponseDto } from '../../models/domain/user.model';

@Component({
    selector: 'app-ikgs-style-configuration-form',
    imports: [
        CommonModule, ReactiveFormsModule,
        StepperModule, SelectModule, InputTextModule,
        RadioButtonModule, ButtonModule, TextareaModule,
        TableModule, InputNumberModule, SelectButtonModule
    ],
    templateUrl: './ikgs-style-configuration-form.html',
    styleUrl: './ikgs-style-configuration-form.scss',
})
export class IkgsStyleConfigurationForm {
    messageService = inject(MessageService);
    restService = inject(IkgsRest);
    loading = signal(false);



    activeStep = signal(0);


    styleTypes = signal([
        { value: 'G', viewValue: 'Garment' },
        { value: 'F', viewValue: 'Fabric' },
    ]);

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
            style_Id: [0],
            customer_Id: [0, Validators.required],
            config_Type: ['G'],
            season_Id: [0, Validators.required],
            gender_Id: [0, Validators.required],
            product_Type_Id: [0],
            product_Sub_Type_Id: [0],
            lead_Days: [null],
            fabric_Gsm: [null],
            garment_Gsm: [null],
            style_Description: [''],
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
        if (this.activeStep() === 0) {

            // Validate Step 1 form
            if (this.configForm.invalid) {
                this.configForm.markAllAsTouched();
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill all required fields.'
                });
                return;
            }

            this.addUpdateStyleConfigMain();
            return;
        }
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

    allCustomers: WritableSignal<SelectionValueModel[]> = signal([]);
    allGenders: WritableSignal<SelectionValueModel[]> = signal([]);
    allProductTypes: WritableSignal<SelectionValueModel[]> = signal([]);
    allProductSubTypes: WritableSignal<SelectionValueModel[]> = signal([]);
    allSeasons: WritableSignal<SelectionValueModel[]> = signal([]);



    ngOnInit() {
        this.callCatalogApis();
    }


    callCatalogApis() {
        this.getAllCustomers();
        this.getAllGenders();
        this.getAllProductTypes();
        this.getAllProductSubTypes();
        this.getAllSeasons();
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
            });
    }


    getAllGenders() {
        this.allGenders.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.AllGenders;
        this.restService
            .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
                if (result?.Code === 200 && result.Data) {
                    this.allGenders.set(result.Data);
                }
            });
    }

    getAllProductTypes() {
        this.allProductTypes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.AllProductTypes;
        this.restService
            .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
                if (result?.Code === 200 && result.Data) {
                    this.allProductTypes.set(result.Data);
                }
            });
    }


    getAllProductSubTypes() {
        this.allProductSubTypes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.AllProductSubTypes;
        this.restService
            .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
                if (result?.Code === 200 && result.Data) {
                    this.allProductSubTypes.set(result.Data);
                }
            });
    }

    getAllSeasons() {
        this.allSeasons.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.AllSeasons;
        this.restService
            .CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: ApiResponseModel<SelectionValueModel[]>) => {
                if (result?.Code === 200 && result.Data) {
                    this.allSeasons.set(result.Data);
                }
            });
    }


    addUpdateStyleConfigMain() {
        this.loading.set(true);
        let authApiOpts: ApiOptionsModel<StyleConfigMainDto> = new ApiOptionsModel<StyleConfigMainDto>();
        authApiOpts.RequestType = RequestType.POST;
        authApiOpts.ParamObj = this.configForm.value;
        authApiOpts.Repository = Repository.StyleConfiguration;
        authApiOpts.EndPoint = EndPoints.AddUpdateStyleConfigMain;
        this.restService.CallApi<StyleConfigMainDto, StyleConfigMainDto>(authApiOpts).subscribe(
            (result: ApiResponseModel<StyleConfigMainDto>) => {
                if (result) {
                    if (result.Code === 200) {
                        if (result.Data) {
                            console.log(result.Data);
                            this.configForm.patchValue({ style_Id: result.Data.style_Id });
                            this.loading.set(false);
                            this.activeStep.set(1);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Basic configuration saved successfully.'
                            });
                        }
                    }
                } else {
                    this.loading.set(false)
                }
            },
            (error: any) => {
                this.loading.set(false);
            }
        );
    }
}
