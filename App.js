import React, { useState, useEffect, useMemo } from "react";
import { Card, InputNumber, Table, Typography, Row, Col, Form, Select, Descriptions } from "antd";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import "antd/dist/reset.css";

const { Title, Text } = Typography;
const { Option } = Select;

const templates = [
  {
    salaryTemplateName: "Template 1",
    earning_components: [
      { name: "Basic", percentage: 50 },
      { name: "HRA", percentage: 40 },
      { name: "Other Allowance", percentage: 30 },
    ],
    deduction_components: [
      {
        name: "PF",
        employee_share_percentage: 12,
        employer_share_percentage: 12,
      },
      {
        name: "ESIC",
        employee_share_percentage: 3.25,
        employer_share_percentage: 0.75,
      },
    ],
  },
  {
    salaryTemplateName: "Template 2",
    earning_components: [
      { name: "Basic", percentage: 60 },
      { name: "HRA", percentage: 30 },
      { name: "Special Allowance", percentage: 10 },
    ],
    deduction_components: [
      {
        name: "PF",
        employee_share_percentage: 12,
        employer_share_percentage: 12,
      },
      {
        name: "ESIC",
        employee_share_percentage: 3.25,
        employer_share_percentage: 0.75,
      },
    ],
  },
];

const calculateAmountFromPercentage = (percentage, amount) => {
  if (!percentage || !amount) return 0;
  return parseFloat(((percentage / 100) * amount).toFixed(2));
};

export const config = {
  pfEmployeeLimit: 15000,
  esicEmployeeLimit: 21000,
};

const SalaryCalculation = () => {
  const [grossAmountMonthly, setGrossAmountMonthly] = useState(null);
  const [grossAmountYearly, setGrossAmountYearly] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form] = Form.useForm();
  const [components, setComponents] = useState({});

  const handleTemplateChange = (value) => {
    const template = templates.find((t) => t.salaryTemplateName === value);
    setSelectedTemplate(template);
    if (template) {
      setComponents(template);
      form.setFieldsValue(template);
    }
  };

  useEffect(() => {
    if (grossAmountMonthly) {
      setGrossAmountYearly(grossAmountMonthly * 12);
    }
  }, [grossAmountMonthly]);

  useEffect(() => {
    if (grossAmountYearly) {
      setGrossAmountMonthly(grossAmountYearly / 12);
    }
  }, [grossAmountYearly]);

  const componentAmounts = useMemo(() => {
    if (!grossAmountMonthly || !selectedTemplate) return {};

    const amounts = {};
    Object.keys(components).forEach((key) => {
      if (key !== "salaryTemplateName") {

        components.earning_components.map((item, index) => {
          const amount = item.name === "HRA" ? calculateAmountFromPercentage(item.percentage, calculateAmountFromPercentage(components.earning_components.find(e => e.name.toLowerCase() === "basic")?.percentage, grossAmountMonthly)) : calculateAmountFromPercentage(item.percentage, grossAmountMonthly);
          amounts[item.name] = amount;
        })
      }
    });
    return amounts;
  }, [grossAmountMonthly, selectedTemplate]);

  const deductionAmounts = useMemo(() => {
    if (!grossAmountMonthly || !selectedTemplate) return {};

    const amounts = {};
    selectedTemplate.deduction_components.forEach((item) => {
      if (item.name === "PF") {
        const totalConsideredAmount = componentAmounts["Basic"] + Object.keys(componentAmounts)
          .filter((key) => key !== "HRA" && key !== "Basic")
          .reduce((sum, key) => sum + componentAmounts[key], 0);

        const employeePF =
          totalConsideredAmount > config.pfEmployeeLimit
            ? calculateAmountFromPercentage(item.employee_share_percentage, config.pfEmployeeLimit)
            : calculateAmountFromPercentage(item.employee_share_percentage, totalConsideredAmount);

        amounts[item.name] = {
          employeeAmount: employeePF,
          percentage: `${item.employee_share_percentage}%`,
        };
      }

      if (item.name === "ESIC") {
        const employeeESIC =
          grossAmountMonthly <= config.esicEmployeeLimit
            ? calculateAmountFromPercentage(item.employee_share_percentage, grossAmountMonthly)
            : 0;

        amounts[item.name] = {
          employeeAmount: employeeESIC,
          percentage: `${item.employee_share_percentage}%`,
        };
      }
    });

    return amounts;
  }, [grossAmountMonthly, selectedTemplate, componentAmounts]);

  const employerContribution = useMemo(() => {
    if (!grossAmountMonthly || !selectedTemplate) return {};

    const amounts = {};
    selectedTemplate.deduction_components.forEach((item) => {
      if (item.name === "PF") {
        const totalConsideredAmount = componentAmounts["Basic"] + Object.keys(componentAmounts)
          .filter((key) => key !== "HRA" && key !== "Basic")
          .reduce((sum, key) => sum + componentAmounts[key], 0);

        const employerPF =
          totalConsideredAmount > config.pfEmployeeLimit
            ? calculateAmountFromPercentage(item.employer_share_percentage, config.pfEmployeeLimit)
            : calculateAmountFromPercentage(item.employer_share_percentage, totalConsideredAmount);

        amounts[item.name] = {
          employerAmount: employerPF,
          percentage: `${item.employer_share_percentage}%`,
        };
      }

      if (item.name === "ESIC") {
        const employerESIC =
          grossAmountMonthly <= config.esicEmployeeLimit
            ? calculateAmountFromPercentage(item.employer_share_percentage, grossAmountMonthly)
            : 0;

        amounts[item.name] = {
          employerAmount: employerESIC,
          percentage: `${item.employer_share_percentage}%`,
        };
      }
    });
    
    return amounts;
  }, [grossAmountMonthly, selectedTemplate, componentAmounts]);

  const totalDeduction = Object.values(deductionAmounts).reduce((sum, deduction) => sum + (deduction.employeeAmount || 0), 0);
  const totalEmployerContribution = Object.values(employerContribution).reduce((sum, contribution) => sum + (contribution.employerAmount || 0), 0);
  const netPay = grossAmountMonthly ? (grossAmountMonthly - totalDeduction).toFixed(2) : 0;
  const monthlyCTCIncludingPF = grossAmountMonthly + totalEmployerContribution;
  const yearlyCTCIncludingPF = monthlyCTCIncludingPF * 12;

  const earningColumns = [
    { title: "Description", dataIndex: "description" },
    { title: "Percentage", dataIndex: "percentage" },
    { title: "Monthly Amount", dataIndex: "amount" },
    { title: "Annual Amount", dataIndex: "yearlyAmount" },
  ];

  const deductionColumns = [
    { title: "Description", dataIndex: "description" },
    { title: "Percentage", dataIndex: "percentage" },
    { title: "Monthly Amount", dataIndex: "monthlyAmount" },
    { title: "Annual Amount", dataIndex: "yearlyAmount" },
  ];

  const earningDataSource = Object.keys(componentAmounts).map((key, index) => {
    const component = components.earning_components.find((item) => item.name === key);

    return {
      key: index,
      description: key.toUpperCase(),
      percentage: component ? `${component.percentage}%` : "-",
      amount: componentAmounts[key],
      yearlyAmount: componentAmounts[key] * 12,
    };
  });

  const deductionDataSource = Object.keys(deductionAmounts).map((key, index) => ({
    key: index,
    description: key,
    percentage: deductionAmounts[key].percentage,
    monthlyAmount: deductionAmounts[key].employeeAmount,
    yearlyAmount: deductionAmounts[key].employeeAmount * 12,
  }));

  const chartData = {
    labels: [...Object.keys(componentAmounts).map((key) => key.toUpperCase()), ...Object.keys(deductionAmounts).map((key) => key.toUpperCase())],
    datasets: [
      {
        label: "Salary Components",
        data: [...Object.values(componentAmounts), ...Object.values(deductionAmounts).map((deduction) => deduction.amount)],
        backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0", "#9966FF", "#FF9F40"],
      },
    ],
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: "5px" }}>
      <Card style={{ width: 600 }}>
        <div className="flex justify-between items-center">
          <Title level={2}>Salary Calculation Breakup</Title>
          <Form form={form}>
            <Form.Item label="Select Salary Template">
              <Select placeholder="Select Template" onChange={handleTemplateChange}>
                {templates.map((template, index) => (
                  <Option key={index} value={template.salaryTemplateName}>
                    {template.salaryTemplateName}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </div>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Monthly Gross">
                <InputNumber
                  value={grossAmountMonthly}
                  onChange={setGrossAmountMonthly}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Yearly Gross">
                <InputNumber
                  value={grossAmountYearly}
                  onChange={setGrossAmountYearly}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
        <Title level={3}>Earnings</Title>
        <Table columns={earningColumns} dataSource={earningDataSource} pagination={false} />
        <Title level={3} style={{ marginTop: "5px" }}>Deductions</Title>
        <Table columns={deductionColumns} dataSource={deductionDataSource} pagination={false} />
      </Card>
      <div>
        <Pie data={chartData} style={{ width: 350 }} />
        <br />
        <Descriptions bordered column={1} layout="vertical" size="small">
          <Descriptions.Item label="Total Deduction from Your Gross">
            <Text strong>{totalDeduction}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Total Contribution from Employer">
            {Object.keys(employerContribution).map((key) => (
              <div key={key}>
                <Text strong>{key}</Text> ({employerContribution[key]?.percentage}) : {employerContribution[key]?.employerAmount}
              </div>
            ))}
          </Descriptions.Item>

          <Descriptions.Item label="Net Pay Salary">
            <Text strong>{netPay}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Monthly CTC Including PF (Both Shares)">
            <Text strong>{monthlyCTCIncludingPF.toFixed(2)}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Yearly CTC Including PF (Both Shares)">
            <Text strong>{yearlyCTCIncludingPF.toFixed(2)}</Text>
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
};

export default SalaryCalculation;
