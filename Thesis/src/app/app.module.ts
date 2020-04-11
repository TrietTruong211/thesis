import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent, SearchService, PlottingService } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatSelectModule, MatListModule, MatExpansionModule, MatTabsModule, MatTooltipModule, MatSliderModule 
} from '@angular/material';
import { ClipboardModule } from 'ngx-clipboard';
import { NgxEchartsModule } from 'ngx-echarts'

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    MatSelectModule,
    MatListModule,
    MatExpansionModule,
    MatTabsModule,
    MatTooltipModule,
    MatSliderModule,
    ClipboardModule,
    NgxEchartsModule
  ],
  providers: [SearchService, PlottingService],
  bootstrap: [AppComponent]
})
export class AppModule { }
