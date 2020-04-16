import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent, SearchService, PlottingService } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { MatSelectModule, MatListModule, MatExpansionModule, MatTabsModule, MatTooltipModule, 
  MatSliderModule, MatSnackBarModule, MatButtonModule, MatInputModule
} from '@angular/material';
import { ClipboardModule } from 'ngx-clipboard';
import { NgxEchartsModule } from 'ngx-echarts'
import { ColorPickerModule } from 'ngx-color-picker';

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
    NgxEchartsModule,
    MatSnackBarModule,
    ColorPickerModule,
    MatButtonModule,
    MatInputModule
  ],
  providers: [SearchService, PlottingService],
  bootstrap: [AppComponent]
})
export class AppModule { }
