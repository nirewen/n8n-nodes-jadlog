import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType } from 'n8n-workflow';

import * as cheerio from 'cheerio';

type JadlogResult = {
	dateStr: string;
	origin: string;
	status: string;
	destination: string;
	document: string;
	date: Date;
};

export class JadlogNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Jadlog',
		name: 'jadlog',
		icon: 'file:Jadlog.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$paremeter["trackNumber"]}}',
		description: 'Busca informações sobre uma remessa da Jadlog',
		defaults: {
			name: 'Jadlog',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Número da remessa',
				name: 'trackNumber',
				type: 'string',
				default: '',
				placeholder: '00000000000000',
				description: 'Número da remessa a ser consultada',
			},
		],
	};
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: JadlogResult[] = [];

		let trackNumber: string;

		try {
			trackNumber = this.getNodeParameter('trackNumber', 0) as string;

			const response = await this.helpers.httpRequest({
				method: 'GET',
				url: `https://www.jadlog.com.br/siteInstitucional/tracking_dev.jad`,
				qs: {
					cte: trackNumber,
				},
				json: false,
			});

			const $ = cheerio.load(response);

			const rows = $('table > tbody > tr');

			for (let i = 0; i < rows.length; i++) {
				const row = $(rows[i]);

				const dateStr = row.find('td:nth-of-type(1) span').text();
				const origin = row.find('td:nth-of-type(2) span').text();
				const status = row.find('td:nth-of-type(3) span').text();
				const destination = row.find('td:nth-of-type(4) span').text();
				const document = row.find('td:nth-of-type(5) span').text();

				const [day, month, year, hour, minute] = dateStr.split(/\/|\s|:/).map(Number);

				const date = new Date(year, month - 1, day, hour, minute);

				items.push({
					dateStr,
					origin,
					status,
					destination,
					document,
					date,
				} as JadlogResult);
			}
		} catch (error) {
			console.log(error);
		}

		return [this.helpers.returnJsonArray(items)];
	}
}
