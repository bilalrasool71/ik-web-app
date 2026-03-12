import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { RequestType, Repository, EndPoints } from '../../core/enums/api.enum';
import { ApiOptionsModel } from '../../core/models/api.model';
import { SelectionValueModel } from '../../models/common/selection-value.model';
import { StyleConfigMainDsDto } from '../../models/domain/style-configuration.model';
import { IkgsRest } from '../../core/services/ikgs-rest';

@Component({
    selector: 'app-ikgs-style-configuration',
    imports: [CommonModule, RouterLink, TableModule, ButtonModule, TagModule],
    templateUrl: './ikgs-style-configuration.html',
    styleUrl: './ikgs-style-configuration.scss',
})
export class IkgsStyleConfiguration implements OnInit {
    restService = inject(IkgsRest)
    allStyleConfigurations: WritableSignal<StyleConfigMainDsDto[]> = signal([]);
    ngOnInit() {
        this.getAllStyleConfigurations();
    }

    getAllStyleConfigurations() {
        this.allStyleConfigurations.set([]);
        let authApiOpts = new ApiOptionsModel<StyleConfigMainDsDto[]>();
        authApiOpts.RequestType = RequestType.GET;
        authApiOpts.Repository = Repository.StyleConfiguration;
        authApiOpts.EndPoint = EndPoints.GetAllStyleConfigurations;

        this.restService.CallApi<StyleConfigMainDsDto[], StyleConfigMainDsDto[]>(authApiOpts)
            .subscribe((result: any) => {
                if (result?.Code === 200 && result.Data) {
                    this.allStyleConfigurations.set(result.Data);
                }
            });
    }
}
