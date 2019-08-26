import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface SearchResult {
  title: string;
  DOI: string;
  reference_number: number;

}

function createSearchResult(searchResult: SearchResult): {title: string, DOI: string, reference_number: number} {
  let newSearchResult = {title: '', DOI: '', reference_number: 0};
  newSearchResult.title = searchResult.title;
  newSearchResult.DOI = searchResult.DOI;
  newSearchResult.reference_number = searchResult.reference_number;
  return newSearchResult;
}

const DATA: SearchResult[] = [];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})


export class AppComponent {
  // displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  displayedColumns: string[] = ['title', 'DOI', 'reference_number'];
  dataSource = DATA;

  result: string[];
  metadata: string[];

  constructor(private httpClient: HttpClient) {}
  searchDOI(title: HTMLInputElement) {
// assets/sample.json
    this.httpClient.get(`https://api.crossref.org/works?filter=has-full-text:true&mailto=centory98@gmail.com&query.title=${title.value}`)
    .subscribe(response => {
      console.log(response);
      this.result = response['message']['items'];
      console.log(this.result);
    });
  }

  searchMetadata(DOI: HTMLInputElement) {
    this.httpClient.get(`https://w3id.org/oc/index/coci/api/v1/metadata/${DOI.value}`)
    .subscribe(response => {
      console.log(response);
      this.metadata = response[0]['citation'].split(';');
      console.log(this.metadata);
    });
  }


}
