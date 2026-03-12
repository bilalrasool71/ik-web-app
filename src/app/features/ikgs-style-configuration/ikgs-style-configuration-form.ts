import { Component, inject, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { StyleConfigMainDto } from '../../models/domain/style-configuration.model';
import { AddsOnCatalogDto } from '../../models/domain/addson-catalog.model';
import { StyleConfigColorDto } from '../../models/domain/style-config-color.model';
import { FileUploadComponent } from '../../shared/components/file-upload/file-upload';
import { FileUploadType } from '../../core/enums/file-upload-type.enum';


@Component({
    selector: 'app-ikgs-style-configuration-form',
    imports: [
        CommonModule, ReactiveFormsModule,
        StepperModule, SelectModule, InputTextModule,
        RadioButtonModule, ButtonModule, TextareaModule,
        TableModule, InputNumberModule, SelectButtonModule, FileUploadComponent
    ],
    templateUrl: './ikgs-style-configuration-form.html',
    styleUrl: './ikgs-style-configuration-form.scss',
})
export class IkgsStyleConfigurationForm {
    messageService = inject(MessageService);
    restService = inject(IkgsRest);
    activeStep = signal(0);
    FileUploadType = FileUploadType;




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

    fiberOptions = signal([
        { viewValue: 'Cotton', value: 'Cotton' },
        { viewValue: 'Polyester', value: 'Polyester' },
        { viewValue: 'Spandex', value: 'Spandex' },
        { viewValue: 'Nylon', value: 'Nylon' },
    ]);
    consumptionOptions = signal([
        { viewValue: 'Regular', value: 'Regular' },
        { viewValue: 'High', value: 'High' },
        { viewValue: 'Low', value: 'Low' },
    ]);
    yesNoOptions = [
        { label: 'Yes', value: 'Y' },
        { label: 'No', value: 'N' }
    ];
    configTypeOptions = [
        { label: 'Garment', value: 'G' },
        { label: 'Fabric', value: 'F' }
    ];
    widthTypeOptions = [
        { label: 'Open', value: 'O' },
        { label: 'Tubular', value: 'T' },
        { label: 'Flat', value: 'F' }
    ];
    knitTypeOptions = [
        { label: 'Knit', value: 'K' },
        { label: 'Tuck', value: 'T' },
        { label: 'Loop', value: 'L' }
    ];
    panelTypeOptions = [
        { label: 'Main Body', value: 'Y' },
        { label: 'Trim', value: 'N' }
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

    groupedAddsOns = signal<any[]>([]);

    prepareAddsOns() {
        const data = this.allAddsOnCatalog();

        const grouped = data.map(item => {
            const requirements = item.requirements.map(req => {
                let lovSignal: any = null;
                const ds = item.addsOn_Ds ?? '';

                if (ds.includes('Embroidery')) {
                    if (req.requirements_Id === 1 || req.addsOn_Requirements?.includes('Placement')) lovSignal = this.allPlacementsForEmbroidery;
                    if (req.requirements_Id === 2 || req.addsOn_Requirements?.includes('Type')) lovSignal = this.allEmbTypes;
                    if (req.requirements_Id === 3 || req.addsOn_Requirements?.includes('Process')) lovSignal = this.allDesignsForEmbroidery;
                } else if (ds.includes('Print')) {
                    if (req.requirements_Id === 1 || req.addsOn_Requirements?.includes('Placement')) lovSignal = this.allPlacementsForPrint;
                    if (req.requirements_Id === 2 || req.addsOn_Requirements?.includes('Type')) lovSignal = this.allPrintTypes;
                    if (req.requirements_Id === 3 || req.addsOn_Requirements?.includes('Process')) lovSignal = this.allDesignsForPrint;
                } else if (ds.includes('Wash')) {
                    if (req.requirements_Id === 3 || req.addsOn_Requirements?.includes('Process')) lovSignal = this.allGarmentWashTypes;
                } else {
                    if (req.addsOn_Requirements?.includes('Placement')) lovSignal = this.allPlacementsForEmbroidery;
                    else if (req.addsOn_Requirements?.includes('Type')) lovSignal = this.allEmbTypes;
                    else if (req.addsOn_Requirements?.includes('Process')) lovSignal = this.allDesignsForEmbroidery;
                }

                return {
                    name: req.addsOn_Requirements,
                    signal: lovSignal
                };
            });

            return {
                id: item.addsOn_Id,
                name: item.addsOn_Ds,
                requirements: requirements
            };
        });

        this.groupedAddsOns.set(grouped);
    }

    createColorGroup(): FormGroup {

        const addOnsGroup: any = {};

        this.groupedAddsOns().forEach((addon: any) => {

            const reqGroup: any = {
                enabled: new FormControl('N')
            };

            addon.requirements.forEach((req: any) => {
                reqGroup[req.name] = new FormControl(null);
            });

            const group = this.fb.group(reqGroup);

            // Sync Logic: If any requirement is selected, set enabled to 'Y'
            // OR: If enabled is set to 'N', clear requirements
            group.valueChanges.subscribe(val => {
                const requirements = addon.requirements.map((r: any) => r.name);
                const hasValue = requirements.some((name: string) => !!val[name]);

                if (hasValue && val['enabled'] === 'N') {
                    group.get('enabled')?.setValue('Y', { emitEvent: false });
                }
            });

            group.get('enabled')?.valueChanges.subscribe(enabled => {
                if (enabled === 'N') {
                    const patch: any = {};
                    addon.requirements.forEach((req: any) => {
                        patch[req.name] = null;
                    });
                    group.patchValue(patch, { emitEvent: false });
                }
            });

            addOnsGroup[addon.name] = group;
        });

        return this.fb.group({
            color_RowId: [0],
            color_Id: [null],
            hasAddsOn: ['N'],
            addsOns: this.fb.group(addOnsGroup)
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
            style_Id: [this.configForm.value.style_Id],
            color_RowId: [0],
            fabric_RowId: [0],
            panel_Id: [null, Validators.required],
            size_Id: [null, Validators.required],
            fabric_Id: [null, Validators.required],
            is_Main_Body: ['N'],
            fabric_Composition_Id: [null, Validators.required],
            width_Type: ['O'],
            gsm: [null, Validators.required],
            fab_Color_Id: [null, Validators.required],
            dye_Route_Id: [null, Validators.required],
            dye_Special_Process: [null],
            is_Rotary: ['N'],
            rotary_Design_Id: [null],
            rotary_Color_Id: [null],
            is_Active: ['Y'],
            eby: [1],
            edate: [new Date()],
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
            style_Id: [this.configForm.value.style_Id],
            color_RowId: [0],
            fabric_RowId: [0],
            fiber_Id: [null, Validators.required],
            knit_Type: ['K'],
            fiber_Ratio: [null],
            is_Fiber_Dye: ['N'],
            fiber_Color_Id: [null],
            is_Active: ['Y'],
            eby: [1],
            edate: [new Date()],
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

        if (this.activeStep() === 1) {

            if (this.colorDetailsForm.invalid) {
                this.colorDetailsForm.markAllAsTouched();
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill all required fields.'
                });
                return;
            }

            this.addUpdateStyleConfigColor();
            this.getStyleConfigColorShortByStyleIdForFabric();
            return;
        }

        if (this.activeStep() === 2) {
            if (this.fabricPanelsForm.invalid) {
                this.fabricPanelsForm.markAllAsTouched();
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill all required fields.'
                });
                return;
            }

            this.addUpdateStyleConfigFabric();
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
    allColors: WritableSignal<SelectionValueModel[]> = signal([]);
    allPlacementsForPrint: WritableSignal<SelectionValueModel[]> = signal([]);
    allPlacementsForEmbroidery: WritableSignal<SelectionValueModel[]> = signal([]);
    allPrintTypes: WritableSignal<SelectionValueModel[]> = signal([]);
    allEmbTypes: WritableSignal<SelectionValueModel[]> = signal([]);
    allDesignsForPrint: WritableSignal<SelectionValueModel[]> = signal([]);
    allDesignsForEmbroidery: WritableSignal<SelectionValueModel[]> = signal([]);
    allGarmentWashTypes: WritableSignal<SelectionValueModel[]> = signal([]);
    allPanels: WritableSignal<SelectionValueModel[]> = signal([]);
    allFabricColors: WritableSignal<SelectionValueModel[]> = signal([]);
    allPrintColors: WritableSignal<SelectionValueModel[]> = signal([]);
    allPanelSizes: WritableSignal<SelectionValueModel[]> = signal([]);
    allFabricConsumptions: WritableSignal<SelectionValueModel[]> = signal([]);
    allDyeProcessRoutes: WritableSignal<SelectionValueModel[]> = signal([]);
    allSpecialProcess: WritableSignal<SelectionValueModel[]> = signal([]);
    allFibers: WritableSignal<SelectionValueModel[]> = signal([]);
    allFiberColors: WritableSignal<SelectionValueModel[]> = signal([]);
    allFiberConsumptions: WritableSignal<SelectionValueModel[]> = signal([]);
    allShortColorsForFabricPanels: WritableSignal<SelectionValueModel[]> = signal([]);
    allAddsOnCatalog: WritableSignal<AddsOnCatalogDto[]> = signal([]);
    allFabrics: WritableSignal<SelectionValueModel[]> = signal([]);
    allCompositions: WritableSignal<SelectionValueModel[]> = signal([]);

    ngOnInit() {
        this.callCatalogApis();
    }


    callCatalogApis(calledFor?: string) {
        this.getAllCustomers();
        this.getAllGenders();
        this.getAllProductTypes();
        this.getAllSeasons();
        this.getAllColors();
        this.getAllPlacementsForPrint();
        this.getAllPlacementsForEmbroidery();
        this.getAllPrintTypes();
        this.getAllDesignsForPrint();
        this.getAllDesignsForEmbroidery();
        this.getAllEmbTypes();
        this.getAllGarmentWashTypes();
        this.getAllPanels();
        this.getAllFabricColors();
        this.getAllPrintColors();
        this.getAllDyeProcessRoutes();
        this.getAllSpecialProcess();
        this.getAllFibers();
        this.getAllFiberColors();
        this.getAllFiberConsumptions();
        this.getAllAddsOnCatalog();
        this.getAllPanelSizes();
        this.getAllFabrics();
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
        authApiOpts.ReqQueryParams = [
            {
                Key: 'productTypeId',
                Value: this.configForm.value.product_Type_Id,
                IsDate: false
            },
            {
                Key: 'genderId',
                Value: this.configForm.value.gender_Id,
                IsDate: false
            }
        ]
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
            });
    }


    getAllPlacementsForPrint() {
        this.allPlacementsForPrint.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPlacementsForPrint;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPlacementsForPrint.set(result.Data);
                }
            });
    }

    getAllPlacementsForEmbroidery() {
        this.allPlacementsForEmbroidery.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPlacementsForEmbroidery;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPlacementsForEmbroidery.set(result.Data);
                }
            });
    }

    getAllPrintTypes() {
        this.allPrintTypes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPrintTypes;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPrintTypes.set(result.Data);
                }
            });
    }

    getAllEmbTypes() {
        this.allEmbTypes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllEmbTypes;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allEmbTypes.set(result.Data);
                }
            });
    }

    getAllDesignsForPrint() {
        this.allDesignsForPrint.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllDesignsForPrint;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allDesignsForPrint.set(result.Data);
                }
            });
    }

    getAllDesignsForEmbroidery() {
        this.allDesignsForEmbroidery.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllDesignsForEmbroidery;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allDesignsForEmbroidery.set(result.Data);
                }
            });
    }


    getAllGarmentWashTypes() {
        this.allGarmentWashTypes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllGarmentWashTypes;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allGarmentWashTypes.set(result.Data);
                }
            });
    }

    getAllPanels() {
        this.allPanels.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPanels;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPanels.set(result.Data);
                }
            });
    }

    getAllFabricColors() {
        this.allFabricColors.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllFabricColors;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFabricColors.set(result.Data);
                }
            });
    }

    getAllPrintColors() {
        this.allPrintColors.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPrintColors;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPrintColors.set(result.Data);
                }
            });
    }

    getAllDyeProcessRoutes() {
        this.allDyeProcessRoutes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllDyeProcessRoute;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allDyeProcessRoutes.set(result.Data);
                }
            });
    }

    getAllSpecialProcess() {
        this.allSpecialProcess.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllSpecialProcesses;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allSpecialProcess.set(result.Data);
                }
            });
    }

    getAllFibers() {
        this.allFibers.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllFibers;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFibers.set(result.Data);
                }
            });
    }

    getAllFiberColors() {
        this.allFiberColors.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllFiberColors;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFiberColors.set(result.Data);
                }
            });
    }

    getAllFiberConsumptions() {
        this.allFiberConsumptions.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllFiberConsumptions;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFiberConsumptions.set(result.Data);
                }
            });
    }

    refreshFiberOptions() {
        this.fiberOptions.set([
            { viewValue: 'Cotton', value: 'Cotton' },
            { viewValue: 'Polyester', value: 'Polyester' },
            { viewValue: 'Spandex', value: 'Spandex' },
            { viewValue: 'Nylon', value: 'Nylon' },
        ]);
        this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Fiber options refreshed' });
    }

    refreshConsumptionOptions() {
        this.consumptionOptions.set([
            { viewValue: 'Regular', value: 'Regular' },
            { viewValue: 'High', value: 'High' },
            { viewValue: 'Low', value: 'Low' },
        ]);
        this.messageService.add({ severity: 'info', summary: 'Refreshed', detail: 'Consumption options refreshed' });
    }

    getAllPanelSizes() {
        this.allPanelSizes.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllPanelSizes;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allPanelSizes.set(result.Data);
                }
            });
    }

    getAllFabrics() {
        this.allFabrics.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllFabrics;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFabrics.set(result.Data);
                }
            });
    }

    getAllCompositions() {
        this.allCompositions.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllCompositions;

        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allCompositions.set(result.Data);
                }
            });
    }

    addUpdateStyleConfigMain() {
        let apiOpts: ApiOptionsModel<StyleConfigMainDto> = new ApiOptionsModel<StyleConfigMainDto>();
        apiOpts.RequestType = RequestType.POST;
        apiOpts.ParamObj = this.configForm.value;
        apiOpts.Repository = Repository.StyleConfiguration;
        apiOpts.EndPoint = EndPoints.AddUpdateStyleConfigMain;
        this.restService.CallApi<StyleConfigMainDto, StyleConfigMainDto>(apiOpts).subscribe(
            (result: ApiResponseModel<StyleConfigMainDto>) => {
                if (result) {
                    if (result.Code === 200) {
                        if (result.Data) {
                            this.configForm.patchValue({ style_Id: result.Data.style_Id });
                            this.activeStep.set(1);
                            this.messageService.add({
                                severity: 'success',
                                summary: 'Success',
                                detail: 'Basic configuration saved successfully.'
                            });
                        }
                    }
                }
            }
        );
    }


    getAllAddsOnCatalog() {
        this.allAddsOnCatalog.set([]);
        let authApiOpts = new ApiOptionsModel<AddsOnCatalogDto[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.Catalog;
        authApiOpts.EndPoint = EndPoints.GetAllAddsOnCatalog;

        this.restService.CallApi<AddsOnCatalogDto[], AddsOnCatalogDto[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allAddsOnCatalog.set(result.Data);
                    this.prepareAddsOns();
                    const existingCount = this.colorsArray.length;
                    this.colorDetailsForm.setControl(
                        'colors',
                        this.fb.array(
                            Array(Math.max(existingCount, 1)).fill(null).map(() => this.createColorGroup())
                        )
                    );
                }
            });
    }


    addUpdateStyleConfigColor() {
        const styleId = this.configForm.value.style_Id;
        const colorList: StyleConfigColorDto[] = this.colorsArray.controls.map(ctrl => {
            const colorFormValue = ctrl.value;
            const color: StyleConfigColorDto = {
                ...colorFormValue,
                style_Id: styleId,
                addsOnList: []
            };

            if (colorFormValue.addsOns) {
                const groupedData = this.groupedAddsOns();

                Object.keys(colorFormValue.addsOns).forEach(addonName => {
                    const addonData = colorFormValue.addsOns[addonName];
                    if (addonData && addonData.enabled === 'Y') {
                        const catalogAddon = groupedData.find(a => a.name === addonName);
                        if (catalogAddon) {
                            catalogAddon.requirements.forEach((req: any) => {
                                const reqValue = addonData[req.name];
                                if (reqValue) {
                                    let reqId = 0;
                                    if (addonName.includes('Embroidery') || addonName.includes('Print')) {
                                        if (req.name === 'Placement') reqId = 1;
                                        else if (req.name === 'Type') reqId = 2;
                                        else if (req.name === 'Process') reqId = 3;
                                    } else if (addonName.includes('Wash')) {
                                        if (req.name === 'Process') reqId = 3;
                                    }

                                    color.addsOnList.push({
                                        style_Id: styleId,
                                        color_RowId: colorFormValue.color_RowId || 0,
                                        addson_RowId: 0,
                                        addson_Type_Id: catalogAddon.id,
                                        requirement_Id: reqId,
                                        requirement: reqValue,
                                        is_Active: 'Y',
                                        eby: 1,
                                        edate: new Date()
                                    });
                                }
                            });
                        }
                    }
                });
            }
            return color;
        });

        let apiOpts: ApiOptionsModel<StyleConfigColorDto[]> = new ApiOptionsModel<StyleConfigColorDto[]>();
        apiOpts.RequestType = RequestType.POST;
        apiOpts.ParamObj = colorList;
        apiOpts.Repository = Repository.StyleConfiguration;
        apiOpts.EndPoint = EndPoints.AddUpdateStyleConfigColor;
        this.restService.CallApi<StyleConfigColorDto[], StyleConfigColorDto[]>(apiOpts).subscribe(
            (result: ApiResponseModel<StyleConfigColorDto[]>) => {
                if (result) {
                    if (result.Code === 200) {
                        if (result.Data && result.Data.length > 0) {
                            result.Data.forEach((item, index) => {
                                if (this.colorsArray.at(index)) {
                                    this.colorsArray.at(index).patchValue({
                                        color_RowId: item.color_RowId
                                    }, { emitEvent: false });
                                }
                            });
                        }

                        this.activeStep.set(2);
                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Color details saved successfully.'
                        });
                    }

                }
            }
        );
    }

    getStyleConfigColorShortByStyleIdForFabric() {
        this.allShortColorsForFabricPanels.set([]);
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.StyleConfiguration;
        authApiOpts.ReqQueryParams = [{
            Key: 'style_Id',
            Value: this.configForm.value.style_Id,
            IsDate: false
        }]
        authApiOpts.EndPoint = EndPoints.GetStyleConfigColorShortByStyleIdForFabric;
        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allShortColorsForFabricPanels.set(result.Data);
                }
            });
    }

    addUpdateStyleConfigFabric() {
        const styleId = this.configForm.value.style_Id;
        const panelList = this.panelsArray.value.map((p: any) => ({
            ...p,
            style_Id: styleId,
            is_Active: p.is_Active || 'Y',
            eby: p.eby || 1,
            edate: p.edate || new Date()
        }));

        let apiOpts: ApiOptionsModel<any[]> = new ApiOptionsModel<any[]>();
        apiOpts.RequestType = RequestType.POST;
        apiOpts.ParamObj = panelList;
        apiOpts.Repository = Repository.StyleConfiguration;
        apiOpts.EndPoint = EndPoints.AddUpdateStyleConfigFabricAsync;

        this.restService.CallApi<any[], any[]>(apiOpts).subscribe(
            (result: ApiResponseModel<any[]>) => {
                if (result?.Code === 200) {
                    if (result.Data && result.Data.length > 0) {
                        result.Data.forEach((item, index) => {
                            if (this.panelsArray.at(index)) {
                                this.panelsArray.at(index).patchValue({
                                    fabric_RowId: item.fabric_RowId
                                }, { emitEvent: false });
                            }
                        });
                    }

                    this.activeStep.set(3);
                    this.getStyleConfigFabricShortByStyleIdForFiber();
                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Fabric panels saved successfully.'
                    });
                }
            }
        );
    }

    getStyleConfigFabricShortByStyleIdForFiber() {
        this.allFabrics.set([]); // Or some other signal for fiber dropdown
        let authApiOpts = new ApiOptionsModel<SelectionValueModel[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.StyleConfiguration;
        authApiOpts.ReqQueryParams = [{
            Key: 'style_Id',
            Value: this.configForm.value.style_Id,
            IsDate: false
        }]
        authApiOpts.EndPoint = EndPoints.GetStyleConfigFabricShortByStyleIdForFiber;
        this.restService.CallApi<SelectionValueModel[], SelectionValueModel[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allFabrics.set(result.Data); // Assuming this signal is used in fibers step
                }
            });
    }
}
